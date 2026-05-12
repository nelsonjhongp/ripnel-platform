const { AppError } = require('../../shared/errors');
const { pool } = require('../../shared/db');
const { env } = require('../../config/env');
const { renderProformaSalePdfBuffer } = require('./sales-proforma-pdf');
const {
  findSellableVariants,
  findActiveWholesaleMinQtyRule,
  findAllSales,
  findCustomerBiAnalytics,
  findSaleById,
  findSaleDetailsBySaleId,
  findSalePaymentsBySaleId,
  findSaleReceiptBySaleId,
  findReceiptQueue,
  findCustomerById,
  findCustomerByInternalCode,
  findVariantById,
  getCurrentRetailPriceInTx,
  getCurrentWholesalePriceInTx,
  getInventoryQtyInTx,
  nextSaleNumberInTx,
  insertSale,
  insertSaleDetail,
  insertSalePayment,
  upsertSaleReceiptBySaleId,
  decrementInventoryInTx,
  insertStockMovementInTx,
} = require('./sales.repo');
const { findCashClosingByLocationAndDate } = require('../cash/cash.repo');
const { findActiveUserById } = require('../auth/auth.repo');
const { findDefaultLocationByUserId } = require('../users/users.repo');

const ALLOWED_DOCUMENT_TYPES = ['none', 'proforma', 'boleta', 'factura'];
const ALLOWED_PAYMENT_METHODS = ['cash', 'yape', 'plin', 'transfer'];
const GENERIC_COUNTER_CUSTOMER_CODE = 'SALE-CLI-001';

const TAX_RATE_BY_DOCUMENT = {
  none: 0,
  proforma: 0,
  boleta: 0.18,
  factura: 0.18,
};

const RECEIPT_DOCUMENT_TYPES = ['boleta', 'factura'];
const RECEIPT_PROVIDER_APISUNAT = 'apisunat';
const RECEIPT_QUEUE_STATUS_FILTERS = ['open', 'pending', 'error', 'missing', 'all'];

let receiptRetryJobRunning = false;

function todayPeruDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}

function normalizeUuid(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normalized
  )
    ? normalized
    : null;
}

function normalizeText(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeDate(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

function normalizePositiveInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function normalizeNonNegativeInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
}

function normalizeAmount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
}

function normalizePositiveAmount(value) {
  const parsed = normalizeAmount(value);
  if (parsed === null || parsed <= 0) return null;
  return parsed;
}

function normalizeDiscountMode(value) {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  const lower = normalized.toLowerCase();
  return ['amount', 'percent'].includes(lower) ? lower : null;
}

function normalizePriceOverride(input) {
  if (input === undefined || input === null) {
    return null;
  }

  if (typeof input !== 'object' || Array.isArray(input)) {
    throw new AppError('price_override must be an object', 400);
  }

  const unitPriceFinal = normalizeAmount(input.unit_price_final);
  const reason = normalizeText(input.reason);

  if (unitPriceFinal === null) {
    throw new AppError('price_override.unit_price_final must be a valid amount', 400);
  }

  if (!reason) {
    throw new AppError('price_override.reason is required', 400);
  }

  return {
    unit_price_final: unitPriceFinal,
    reason,
  };
}

function normalizeSaleDiscount(input) {
  if (input === undefined || input === null) {
    return null;
  }

  if (typeof input !== 'object' || Array.isArray(input)) {
    throw new AppError('sale_discount must be an object', 400);
  }

  const mode = normalizeDiscountMode(input.mode);
  const value = normalizePositiveAmount(input.value);
  const reason = normalizeText(input.reason);

  if (!mode) {
    throw new AppError('sale_discount.mode must be amount or percent', 400);
  }

  if (value === null) {
    throw new AppError('sale_discount.value must be a positive amount', 400);
  }

  if (!reason) {
    throw new AppError('sale_discount.reason is required', 400);
  }

  return {
    mode,
    value,
    reason,
  };
}

function computeSaleDiscountAmount(discount, subtotalAmount) {
  if (!discount) return 0;

  if (subtotalAmount <= 0) {
    throw new AppError('A discount cannot be applied to an empty subtotal', 400);
  }

  if (discount.mode === 'percent') {
    if (discount.value > 100) {
      throw new AppError('sale_discount.value cannot exceed 100 when mode is percent', 400);
    }

    return round2((subtotalAmount * discount.value) / 100);
  }

  if (discount.value > subtotalAmount) {
    throw new AppError('sale_discount.value cannot exceed subtotal amount', 400);
  }

  return round2(discount.value);
}

function allocateSaleDiscountAcrossItems(items, saleDiscountAmount) {
  if (!Array.isArray(items) || !items.length || saleDiscountAmount <= 0) {
    return items.map((item) => ({
      ...item,
      line_discount_amount: 0,
      line_subtotal: item.line_subtotal_before_discount,
    }));
  }

  const totalBase = round2(
    items.reduce((accumulator, item) => accumulator + Number(item.line_subtotal_before_discount || 0), 0)
  );

  let remainingDiscount = saleDiscountAmount;

  return items.map((item, index) => {
    const baseLineSubtotal = round2(Number(item.line_subtotal_before_discount || 0));
    const lineDiscount =
      index === items.length - 1
        ? remainingDiscount
        : round2((saleDiscountAmount * baseLineSubtotal) / totalBase);
    const cappedLineDiscount = Math.min(baseLineSubtotal, Math.max(lineDiscount, 0), remainingDiscount);

    remainingDiscount = round2(remainingDiscount - cappedLineDiscount);

    return {
      ...item,
      line_discount_amount: cappedLineDiscount,
      line_subtotal: round2(baseLineSubtotal - cappedLineDiscount),
    };
  });
}

function applyTaxesToComputedItems(items, taxRate) {
  const subtotalAmount = round2(
    items.reduce((accumulator, item) => accumulator + Number(item.line_subtotal || 0), 0)
  );
  const taxAmount = round2(subtotalAmount * taxRate);
  let remainingTax = taxAmount;

  const computedItems = items.map((item, index) => {
    const lineTax =
      index === items.length - 1 ? remainingTax : round2(Number(item.line_subtotal || 0) * taxRate);

    remainingTax = round2(remainingTax - lineTax);

    return {
      ...item,
      unit_price_final: round2(Number(item.line_subtotal || 0) / item.quantity),
      line_tax: lineTax,
      line_total: round2(Number(item.line_subtotal || 0) + lineTax),
    };
  });

  return {
    items: computedItems,
    subtotalAmount,
    taxAmount,
    totalAmount: round2(subtotalAmount + taxAmount),
  };
}

function normalizeSalePayments(rawPayments, fallbackPaymentMethod, totalAmount) {
  if (rawPayments !== undefined && rawPayments !== null) {
    if (!Array.isArray(rawPayments) || !rawPayments.length) {
      throw new AppError('payments must be a non-empty array when provided', 400);
    }

    const normalizedPayments = rawPayments.map((payment, index) => {
      const method = normalizeText(payment && payment.method);
      const amount = normalizePositiveAmount(payment && payment.amount);
      const reference = normalizeText(payment && payment.reference);

      if (!ALLOWED_PAYMENT_METHODS.includes(method)) {
        throw new AppError(`payments[${index}].method is invalid`, 400);
      }

      if (amount === null) {
        throw new AppError(`payments[${index}].amount must be a positive amount`, 400);
      }

      return {
        method,
        amount,
        reference,
      };
    });

    const paymentTotal = round2(
      normalizedPayments.reduce((accumulator, payment) => accumulator + payment.amount, 0)
    );

    if (Math.abs(paymentTotal - totalAmount) >= 0.01) {
      throw new AppError('The sum of payments must match the sale total amount', 400);
    }

    return normalizedPayments;
  }

  if (!ALLOWED_PAYMENT_METHODS.includes(fallbackPaymentMethod)) {
    throw new AppError('Invalid payment_method', 400);
  }

  return [
    {
      method: fallbackPaymentMethod,
      amount: totalAmount,
      reference: null,
    },
  ];
}

function normalizeReceiptQueueLimit(value, fallback = 50) {
  const parsed = normalizePositiveInteger(value);
  if (!parsed) return fallback;
  return Math.min(parsed, 200);
}

function normalizeSalesPage(value) {
  const parsed = normalizePositiveInteger(value);
  return parsed || 1;
}

function normalizeSalesPageSize(value, fallback = 25) {
  const parsed = normalizePositiveInteger(value);
  if (!parsed) return fallback;
  return Math.min(parsed, 100);
}

function normalizeSalesOffset(value) {
  const parsed = normalizeNonNegativeInteger(value);
  return parsed === null ? 0 : parsed;
}

function normalizeSalesCursor(value) {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  try {
    const raw = Buffer.from(normalized, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    const saleId = normalizeUuid(parsed && parsed.sale_id);
    const sortDate = normalizeText(parsed && parsed.sort_date);

    if (!saleId || !sortDate || Number.isNaN(Date.parse(sortDate))) {
      throw new Error('Invalid cursor payload');
    }

    return {
      saleId,
      sortDate,
      raw: normalized,
    };
  } catch (error) {
    throw new AppError('Invalid cursor value', 400);
  }
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function sumSaleItemQuantity(items = []) {
  return items.reduce((accumulator, item) => accumulator + Number(item.quantity || 0), 0);
}

function shouldApplyWholesaleRule(totalQuantity, wholesaleRule) {
  return Boolean(
    wholesaleRule &&
      Number.isInteger(Number(wholesaleRule.min_qty)) &&
      totalQuantity >= Number(wholesaleRule.min_qty)
  );
}

function pickFirstText(...values) {
  for (const value of values) {
    const normalized = normalizeText(value);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function normalizeReceiptStatus(value) {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  const lower = normalized.toLowerCase();
  if (['pending', 'sent', 'accepted', 'rejected', 'voided', 'error'].includes(lower)) {
    return lower;
  }

  if (lower.includes('acept')) return 'accepted';
  if (lower.includes('rechaz')) return 'rejected';
  if (lower.includes('void') || lower.includes('anul')) return 'voided';
  if (lower.includes('error') || lower.includes('fail')) return 'error';
  if (lower.includes('send') || lower.includes('enviad')) return 'sent';

  return null;
}

function normalizeApiSunatDocStatus(value) {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  const upper = normalized.toUpperCase();
  if (upper === 'ACEPTADO') return 'accepted';
  if (upper === 'RECHAZADO') return 'rejected';
  if (upper === 'EXCEPCION') return 'error';
  if (upper === 'PENDIENTE') return 'pending';

  return normalizeReceiptStatus(normalized);
}

function normalizeUnixEpochToIso(value) {
  const asNumber = Number(value);
  if (!Number.isFinite(asNumber) || asNumber <= 0) return null;

  const timestampMs = asNumber > 9999999999 ? asNumber : asNumber * 1000;
  const asDate = new Date(timestampMs);

  if (Number.isNaN(asDate.getTime())) return null;
  return asDate.toISOString();
}

function isReceiptDocumentType(documentType) {
  return RECEIPT_DOCUMENT_TYPES.includes(documentType);
}

function deriveReceiptNumberParts(saleNumber, documentType) {
  const fallbackSeries = documentType === 'factura' ? 'F001' : 'B001';
  const [prefix = '', rawCorrelative = ''] = String(saleNumber || '').split('-');

  const mappedSeries =
    prefix === 'F' ? 'F001' : prefix === 'B' ? 'B001' : fallbackSeries;

  const normalizedCorrelative = String(rawCorrelative || '')
    .replace(/\D/g, '')
    .padStart(8, '0')
    .slice(-8);

  return {
    series: mappedSeries,
    correlative: normalizedCorrelative || '00000000',
  };
}

function mapDocumentTypeToSunatCode(documentType) {
  if (documentType === 'factura') return '01';
  if (documentType === 'boleta') return '03';
  return '00';
}

function mapCustomerDocTypeToApiSunatCode(documentType) {
  const normalized = String(documentType || '').toLowerCase();

  if (normalized === 'dni') return '1';
  if (normalized === 'ruc') return '6';
  if (normalized === 'ce') return '4';
  if (normalized === 'passport') return '7';
  return '0';
}

function normalizeIsoDate(value) {
  if (!value) return null;

  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) return null;

  return asDate.toISOString().slice(0, 10);
}

function normalizeIsoTime(value) {
  if (!value) return null;

  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) return null;

  return asDate.toISOString().slice(11, 19);
}

function buildApiSunatIssueFileName(receiptNumber, documentType) {
  const issuerDocument = sanitizePathSegment(env.apiSunatIssuerDocument || '', '');
  const documentCode = sanitizePathSegment(mapDocumentTypeToSunatCode(documentType), '00');
  const series = sanitizePathSegment(receiptNumber && receiptNumber.series, 'DOC');
  const correlative = sanitizePathSegment(receiptNumber && receiptNumber.correlative, '00000000');
  const template =
    normalizeText(env.apiSunatIssueFileNameTemplate) ||
    ':issuerDocument-:documentCode-:series-:correlative';

  return sanitizePathSegment(
    template
      .replace(':issuerDocument', issuerDocument)
      .replace(':documentCode', documentCode)
      .replace(':series', series)
      .replace(':correlative', correlative),
    `${issuerDocument}-${documentCode}-${series}-${correlative}`
  );
}

function buildApiSunatIssueUrl() {
  const configuredBaseUrl = normalizeText(env.apiSunatBaseUrl);
  const configuredIssuePath = normalizeText(env.apiSunatIssuePath);
  const personaId = normalizeText(env.apiSunatPersonaId);
  const personaToken = normalizeText(env.apiSunatPersonaToken);
  const fileName = sanitizePathSegment(arguments[0], 'document');

  if (!configuredBaseUrl) {
    throw new Error('APISUNAT_BASE_URL is not configured');
  }

  if (!configuredIssuePath) {
    throw new Error('APISUNAT_ISSUE_PATH is not configured');
  }

  if ((configuredIssuePath.includes(':personaId') || configuredIssuePath.includes(':personaToken')) && (!personaId || !personaToken)) {
    throw new Error('APISUNAT_PERSONA_ID and APISUNAT_PERSONA_TOKEN are required for sendBill');
  }

  const replacedPath = configuredIssuePath
    .replace(':personaId', encodeURIComponent(String(personaId || '')))
    .replace(':personaToken', encodeURIComponent(String(personaToken || '')))
    .replace(':fileName', encodeURIComponent(String(fileName || 'document')));

  if (/^https?:\/\//i.test(replacedPath)) {
    return replacedPath;
  }

  return new URL(replacedPath, configuredBaseUrl).toString();
}

function buildApiSunatIssueUrlCandidates(fileName) {
  const configuredBaseUrl = normalizeText(env.apiSunatBaseUrl);
  const configuredIssuePath = normalizeText(env.apiSunatIssuePath);
  const personaId = normalizeText(env.apiSunatPersonaId);
  const personaToken = normalizeText(env.apiSunatPersonaToken);

  if (!configuredBaseUrl) {
    throw new Error('APISUNAT_BASE_URL is not configured');
  }

  if (!configuredIssuePath) {
    throw new Error('APISUNAT_ISSUE_PATH is not configured');
  }

  const candidateUrls = [];

  const addCandidate = (pathOrUrl) => {
    if (!pathOrUrl) return;

    if ((String(pathOrUrl).includes(':personaId') || String(pathOrUrl).includes(':personaToken')) && (!personaId || !personaToken)) {
      return;
    }

    const replacedPath = String(pathOrUrl)
      .replace(':personaId', encodeURIComponent(String(personaId || '')))
      .replace(':personaToken', encodeURIComponent(String(personaToken || '')))
      .replace(':fileName', encodeURIComponent(String(fileName || 'document')));

    const rawUrl = /^https?:\/\//i.test(replacedPath)
      ? replacedPath
      : new URL(replacedPath, configuredBaseUrl).toString();
    const finalUrl = rawUrl;

    if (!candidateUrls.includes(finalUrl)) {
      candidateUrls.push(finalUrl);
    }
  };

  addCandidate(configuredIssuePath);
  addCandidate('/personas/v1/sendBill');
  addCandidate('/personas/:personaId/:personaToken/:fileName');

  return candidateUrls;
}

function buildApiSunatGetByIdUrl(documentId) {
  const configuredBaseUrl = normalizeText(env.apiSunatBaseUrl);
  const configuredGetByIdPath = normalizeText(env.apiSunatGetByIdPath);

  if (!configuredBaseUrl) {
    throw new Error('APISUNAT_BASE_URL is not configured');
  }

  if (!configuredGetByIdPath) {
    throw new Error('APISUNAT_GET_BY_ID_PATH is not configured');
  }

  const replacedPath = configuredGetByIdPath.replace(
    ':documentId',
    encodeURIComponent(String(documentId || ''))
  );

  if (/^https?:\/\//i.test(replacedPath)) {
    return replacedPath;
  }

  return new URL(replacedPath, configuredBaseUrl).toString();
}

function sanitizePathSegment(value, fallbackValue) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return fallbackValue;
  }

  return normalized
    .replace(/[\\/\?#%]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || fallbackValue;
}

function extractApiSunatDocumentId(data, response) {
  return pickFirstText(
    data && data.documentId,
    data && data.document_id,
    data && data.documentID,
    data && data.id,
    response && response.documentId,
    response && response.document_id,
    response && response.documentID,
    response && response.id
  );
}

function buildApiSunatPdfUrl(documentId, receiptNumber) {
  const configuredBaseUrl = normalizeText(env.apiSunatBaseUrl);
  const configuredPdfPath = normalizeText(env.apiSunatGetPdfPath);

  if (!configuredBaseUrl || !configuredPdfPath || !documentId) {
    return null;
  }

  const format = sanitizePathSegment(env.apiSunatPdfFormat || 'A4', 'A4');
  const canonicalFileName = normalizeText(receiptNumber && receiptNumber.fileName);
  const fallbackTemplate =
    normalizeText(env.apiSunatPdfFileNameTemplate) || ':series-:correlative';
  const rawFileName = canonicalFileName
    ? canonicalFileName.replace(/\.pdf$/i, '')
    : fallbackTemplate
        .replace(':series', String(receiptNumber.series || 'DOC'))
        .replace(':correlative', String(receiptNumber.correlative || '00000000'));
  const fileName = sanitizePathSegment(rawFileName, 'document');

  const replacedPath = configuredPdfPath
    .replace(':documentId', encodeURIComponent(String(documentId)))
    .replace(':format', encodeURIComponent(format))
    .replace(':fileName', encodeURIComponent(fileName));

  if (/^https?:\/\//i.test(replacedPath)) {
    return replacedPath;
  }

  return new URL(replacedPath, configuredBaseUrl).toString();
}

function buildApiSunatRequestHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

function buildApiSunatQueryAuth(url) {
  const personaId = normalizeText(env.apiSunatPersonaId);
  const personaToken = normalizeText(env.apiSunatPersonaToken);

  if (!personaId || !personaToken) {
    return url;
  }

  const nextUrl = new URL(url);
  nextUrl.searchParams.set('personaId', personaId);
  nextUrl.searchParams.set('personaToken', personaToken);

  return nextUrl.toString();
}

async function fetchApiSunatDocumentById(documentId) {
  if (typeof fetch !== 'function') {
    throw new Error('Fetch API is not available in this Node runtime');
  }

  const token = normalizeText(env.apiSunatToken);

  if (!documentId) {
    throw new Error('documentId is required to query APISUNAT getById');
  }

  const rawEndpoint = buildApiSunatGetByIdUrl(documentId);
  const endpoint = buildApiSunatQueryAuth(rawEndpoint);
  const timeoutMs = Math.max(1000, Number(env.apiSunatTimeoutMs) || 15000);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers:
        token && !/^replace-with-/i.test(token) ? buildApiSunatRequestHeaders(token) : undefined,
      signal: controller.signal,
    });

    const responseText = await response.text();
    let responsePayload = null;

    try {
      responsePayload = responseText ? JSON.parse(responseText) : {};
    } catch (error) {
      responsePayload = { message: responseText || null };
    }

    if (!response.ok) {
      const errorMessage =
        pickFirstText(responsePayload && responsePayload.message, response.statusText) ||
        `APISUNAT getById failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    return responsePayload;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getSaleReceiptBySaleIdSafe(saleId) {
  try {
    return await findSaleReceiptBySaleId(saleId);
  } catch (error) {
    if (error && error.code === '42P01') {
      return null;
    }

    throw error;
  }
}

async function upsertSaleReceiptBySaleIdSafe(data) {
  try {
    return await upsertSaleReceiptBySaleId(data);
  } catch (error) {
    if (error && error.code === '42P01') {
      return null;
    }

    throw error;
  }
}

function buildApiSunatDocumentBody(sale, receiptNumber) {
  const details = Array.isArray(sale.details) ? sale.details : [];
  const issuerRuc = normalizeText(env.apiSunatIssuerDocument);
  const documentCode = mapDocumentTypeToSunatCode(sale.document_type);
  const legacyDocumentName = sale.document_type === 'factura' ? 'factura' : 'boleta';
  const issueDate =
    normalizeIsoDate(sale.confirmed_at) ||
    normalizeIsoDate(sale.created_at) ||
    new Date().toISOString().slice(0, 10);

  const subtotal = round2(Number(sale.subtotal_amount || 0));
  const tax = round2(Number(sale.tax_amount || 0));
  const total = round2(Number(sale.total_amount || 0));

  const customerDocType = mapCustomerDocTypeToApiSunatCode(sale.customer_doc_type);
  const customerDocNumber = normalizeText(sale.customer_doc_number) || '-';
  const customerName =
    normalizeText(sale.customer_name_text) ||
    (customerDocType === '6' ? 'CLIENTE FACTURA' : 'CLIENTE VARIOS');
  const customerAddress = normalizeText(sale.customer_address_text) || '-';
  const issueTime =
    normalizeIsoTime(sale.confirmed_at) || normalizeIsoTime(sale.created_at) || '00:00:00';

  const companyName = normalizeText(env.apiSunatIssuerBusinessName) || 'EMPRESA DEMO';
  const companyCommercialName =
    normalizeText(env.apiSunatIssuerCommercialName) || companyName;
  const companyUbigeo = normalizeText(env.apiSunatIssuerUbigeo) || '150101';
  const companyDepartment = normalizeText(env.apiSunatIssuerDepartment) || 'LIMA';
  const companyProvince = normalizeText(env.apiSunatIssuerProvince) || 'LIMA';
  const companyDistrict = normalizeText(env.apiSunatIssuerDistrict) || 'LIMA';
  const companyUrbanization = normalizeText(env.apiSunatIssuerUrbanization) || '-';
  const companyAddress = normalizeText(env.apiSunatIssuerAddress) || 'DIRECCION FISCAL';
  const companyLocalCode = normalizeText(env.apiSunatIssuerLocalCode) || '0000';
  const formatAmount = (value) => round2(Number(value || 0)).toFixed(2);

  return {
    ublVersion: '2.1',
    tipoOperacion: '0101',
    tipoDoc: documentCode,
    serie: receiptNumber.series,
    correlativo: receiptNumber.correlative,
    fechaEmision: issueDate,
    horaEmision: issueTime,
    tipoMoneda: normalizeText(sale.currency) || 'PEN',
    company: {
      ruc: issuerRuc,
      razonSocial: companyName,
      nombreComercial: companyCommercialName,
      address: {
        ubigeo: companyUbigeo,
        departamento: companyDepartment,
        provincia: companyProvince,
        distrito: companyDistrict,
        urbanizacion: companyUrbanization,
        direccion: companyAddress,
        codLocal: companyLocalCode,
      },
    },
    client: {
      tipoDoc: customerDocType,
      numDoc: customerDocNumber,
      rznSocial: customerName,
      address: {
        direccion: customerAddress,
      },
    },
    mtoOperGravadas: subtotal,
    mtoIGV: tax,
    totalImpuestos: tax,
    valorVenta: subtotal,
    subTotal: total,
    mtoImpVenta: total,
    documento: legacyDocumentName,
    numero_documento: receiptNumber.correlative,
    fecha_de_emision: issueDate,
    moneda: normalizeText(sale.currency) || 'PEN',
    cliente_tipo_de_documento: customerDocType,
    cliente_numero_de_documento: customerDocNumber,
    cliente_denominacion: customerName,
    cliente_direccion: customerAddress,
    total_gravada: formatAmount(subtotal),
    total_igv: formatAmount(tax),
    total: formatAmount(total),
    details: details.map((detail, index) => {
      const quantity = Number(detail.quantity || 0);
      const lineSubtotal = round2(Number(detail.line_subtotal || 0));
      const lineTax = round2(Number(detail.line_tax || 0));
      const lineTotal = round2(Number(detail.line_total || 0));
      const unitValue = quantity > 0 ? round2(lineSubtotal / quantity) : 0;
      const unitPrice = quantity > 0 ? round2(lineTotal / quantity) : 0;

      return {
        codProducto: normalizeText(detail.sku) || `ITEM-${index + 1}`,
        unidad: 'NIU',
        descripcion: normalizeText(detail.style_name) || 'ITEM',
        cantidad: quantity,
        mtoValorUnitario: unitValue,
        mtoValorVenta: lineSubtotal,
        mtoBaseIgv: lineSubtotal,
        porcentajeIgv: tax > 0 ? 18 : 0,
        igv: lineTax,
        tipAfeIgv: tax > 0 ? '10' : '20',
        totalImpuestos: lineTax,
        mtoPrecioUnitario: unitPrice,
      };
    }),
    items: details.map((detail, index) => {
      const quantity = Number(detail.quantity || 0);
      const lineSubtotal = round2(Number(detail.line_subtotal || 0));
      const lineTotal = round2(Number(detail.line_total || 0));
      const unitValue = quantity > 0 ? round2(lineSubtotal / quantity) : 0;
      const unitPrice = quantity > 0 ? round2(lineTotal / quantity) : 0;

      return {
        codigo_interno: normalizeText(detail.sku) || `ITEM-${index + 1}`,
        unidad_de_medida: 'NIU',
        descripcion: normalizeText(detail.style_name) || 'ITEM',
        cantidad: String(quantity),
        valor_unitario: formatAmount(unitValue),
        porcentaje_igv: '18',
        precio_unitario: formatAmount(unitPrice),
        codigo_tipo_afectacion_igv: tax > 0 ? '10' : '20',
        total_base_igv: formatAmount(lineSubtotal),
        total_igv: formatAmount(round2(Number(detail.line_tax || 0))),
        descuento: '0.00',
      };
    }),
  };
}

function buildApiSunatPayload(endpoint, sale, receiptNumber, fileName) {
  const documentBody = buildApiSunatDocumentBody(sale, receiptNumber);
  const normalizedEndpoint = String(endpoint || '').toLowerCase();

  if (normalizedEndpoint.includes('/v1/sendbill')) {
    return {
      personaId: normalizeText(env.apiSunatPersonaId),
      personaToken: normalizeText(env.apiSunatPersonaToken),
      fileName,
      documentBody,
    };
  }

  return documentBody;
}

function toApiSunatXmlJsNode(value) {
  if (Array.isArray(value)) {
    return value.map((item) => toApiSunatXmlJsNode(item));
  }

  if (value && typeof value === 'object') {
    const output = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      output[key] = toApiSunatXmlJsNode(nestedValue);
    }

    return output;
  }

  return { _text: value === null || value === undefined ? '' : String(value) };
}

function buildApiSunatPayloadCandidates(endpoint, sale, receiptNumber, fileName) {
  const basePayload = buildApiSunatPayload(endpoint, sale, receiptNumber, fileName);
  const normalizedEndpoint = String(endpoint || '').toLowerCase();

  if (!normalizedEndpoint.includes('/v1/sendbill')) {
    return [{ mode: 'base', payload: basePayload }];
  }

  const xmlJsBody = toApiSunatXmlJsNode(basePayload.documentBody || {});

  return [
    { mode: 'base', payload: basePayload },
    {
      mode: 'xmljs-text',
      payload: {
        ...basePayload,
        documentBody: xmlJsBody,
      },
    },
    {
      mode: 'xmljs-text-invoice',
      payload: {
        ...basePayload,
        documentBody: {
          Invoice: xmlJsBody,
        },
      },
    },
  ];
}

function stringifyForLog(value) {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return '[unserializable]';
  }
}

function redactApiSunatLogPayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;

  const cloned = { ...payload };

  if (Object.prototype.hasOwnProperty.call(cloned, 'personaToken')) {
    cloned.personaToken = '[redacted]';
  }

  return cloned;
}

function appendApiSunatHintIfNeeded(message) {
  const text = String(message || '');
  if (!text.includes("reading '_text'")) {
    return text;
  }

  return `${text} | Hint: APISUNAT parser is rejecting documentBody before validation. Verify your company setup in APISUNAT portal (Empresa profile + JSON generator sample) and compare with this payload.`;
}

async function issueReceiptWithApiSunat(sale, receiptNumber) {
  if (typeof fetch !== 'function') {
    throw new Error('Fetch API is not available in this Node runtime');
  }

  const token = normalizeText(env.apiSunatToken);
  const fileName = buildApiSunatIssueFileName(receiptNumber, sale.document_type);
  const endpoints = buildApiSunatIssueUrlCandidates(fileName);
  const timeoutMs = Math.max(1000, Number(env.apiSunatTimeoutMs) || 15000);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let lastError = null;

    for (const endpoint of endpoints) {
      const payloadCandidates = buildApiSunatPayloadCandidates(endpoint, sale, receiptNumber, fileName);

      for (let candidateIndex = 0; candidateIndex < payloadCandidates.length; candidateIndex += 1) {
        const candidate = payloadCandidates[candidateIndex];
        const payload = candidate.payload;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && !/^replace-with-/i.test(token) ? buildApiSunatRequestHeaders(token) : {}),
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        const responseText = await response.text();
        let responsePayload = null;

        try {
          responsePayload = responseText ? JSON.parse(responseText) : {};
        } catch (error) {
          responsePayload = { message: responseText || null };
        }

        const responseStatus = normalizeText(responsePayload && responsePayload.status);

        if (response.ok && (!responseStatus || responseStatus.toUpperCase() === 'PENDIENTE')) {
          return responsePayload;
        }

        if (response.ok && responseStatus && responseStatus.toUpperCase() !== 'PENDIENTE') {
          const semanticMessage =
            pickFirstText(
              responsePayload && responsePayload.message,
              responsePayload && responsePayload.error && responsePayload.error.message,
              responsePayload && responsePayload.error && responsePayload.error.description
            ) || `APISUNAT returned status ${responseStatus}`;

          console.warn(
            `[sales] APISUNAT issue semantic error endpoint=${endpoint} mode=${candidate.mode} payload=${stringifyForLog(
                redactApiSunatLogPayload(payload)
            )} response=${stringifyForLog(responsePayload)}`
          );

          const isLastCandidate = candidateIndex === payloadCandidates.length - 1;
          if (!isLastCandidate) {
            lastError = new Error(
              `[APISUNAT:${responseStatus}] ${semanticMessage} @ ${endpoint} [mode=${candidate.mode}]`
            );
            continue;
          }

          throw new Error(`[APISUNAT:${responseStatus}] ${semanticMessage} @ ${endpoint}`);
        }

        const details =
          pickFirstText(
            responsePayload && responsePayload.message,
            responsePayload && responsePayload.error && responsePayload.error.message,
            responsePayload && responsePayload.error && responsePayload.error.description,
            responsePayload && responsePayload.detail,
            responsePayload && responsePayload.details
          ) || (responseText ? responseText.slice(0, 1000) : null);

        const errorMessage =
          pickFirstText(details, response.statusText) ||
          `APISUNAT request failed with status ${response.status}`;
        lastError = new Error(
          `[${response.status}] ${appendApiSunatHintIfNeeded(errorMessage)} @ ${endpoint}`
        );

        console.warn(
          `[sales] APISUNAT issue failed (${response.status}) endpoint=${endpoint} mode=${candidate.mode} payload=${stringifyForLog(
              redactApiSunatLogPayload(payload)
          )} response=${stringifyForLog(responsePayload)}`
        );

        const isLastCandidate = candidateIndex === payloadCandidates.length - 1;
        const shouldTryNextCandidate = response.status === 400 && !isLastCandidate;

        if (shouldTryNextCandidate) {
          continue;
        }

        if (response.status !== 404) {
          throw lastError;
        }
      }
    }

    throw (
      lastError ||
      new Error(`APISUNAT request failed for all issue endpoints: ${endpoints.join(', ')}`)
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

async function syncReceiptForConfirmedSale(sale) {
  if (!sale || !isReceiptDocumentType(sale.document_type)) {
    return null;
  }

  if (!env.apiSunatEnabled) {
    console.warn(
      `[sales] APISUNAT emission skipped for sale ${sale.sale_id}: APISUNAT_ENABLED is false.`
    );
    return null;
  }

  const issuerDocument = normalizeText(env.apiSunatIssuerDocument);
  if (!issuerDocument) {
    console.warn(
      `[sales] APISUNAT emission skipped for sale ${sale.sale_id}: APISUNAT_ISSUER_DOCUMENT is not configured.`
    );
    return null;
  }

  const receiptNumber = deriveReceiptNumberParts(sale.sale_number, sale.document_type);

  await upsertSaleReceiptBySaleIdSafe({
    sale_id: sale.sale_id,
    document_type: sale.document_type,
    series: receiptNumber.series,
    correlative: receiptNumber.correlative,
    issued_at: sale.confirmed_at || sale.created_at || null,
    provider: RECEIPT_PROVIDER_APISUNAT,
    sunat_status: 'pending',
  });

  try {
    const response = await issueReceiptWithApiSunat(sale, receiptNumber);
    const data = response && typeof response.data === 'object' && response.data ? response.data : response;
    const links = data && typeof data.links === 'object' && data.links ? data.links : {};
    const documentId = extractApiSunatDocumentId(data, response);
    let getByIdDoc = null;

    if (documentId) {
      try {
        getByIdDoc = await fetchApiSunatDocumentById(documentId);
      } catch (error) {
        console.warn(
          `[sales] APISUNAT getById failed for document ${documentId}: ${
            (error && error.message) || 'Unknown error'
          }`
        );
      }
    }

    const docStatus = normalizeApiSunatDocStatus(getByIdDoc && getByIdDoc.status);
    const normalizedIssueTime =
      normalizeUnixEpochToIso(getByIdDoc && getByIdDoc.issueTime) ||
      pickFirstText(data && data.issued_at, response && response.issued_at) ||
      sale.confirmed_at ||
      sale.created_at ||
      null;
    const canonicalFileName = pickFirstText(getByIdDoc && getByIdDoc.fileName, null);
    const inferredPdfUrl = buildApiSunatPdfUrl(documentId, {
      ...receiptNumber,
      fileName: canonicalFileName,
    });
    const faults = Array.isArray(getByIdDoc && getByIdDoc.faults) ? getByIdDoc.faults : [];
    const notes = Array.isArray(getByIdDoc && getByIdDoc.notes) ? getByIdDoc.notes : [];

    const normalizedStatus =
      normalizeReceiptStatus(data && data.sunat_status) ||
      normalizeReceiptStatus(data && data.status) ||
      normalizeReceiptStatus(response && response.sunat_status) ||
      normalizeReceiptStatus(response && response.status) ||
      'sent';

    return upsertSaleReceiptBySaleIdSafe({
      sale_id: sale.sale_id,
      document_type: sale.document_type,
      series: receiptNumber.series,
      correlative: receiptNumber.correlative,
      issued_at: normalizedIssueTime,
      provider: RECEIPT_PROVIDER_APISUNAT,
      external_id: pickFirstText(
        documentId,
        data && data.external_id,
        data && data.ticket,
        data && data.ticket_id,
        data && data.id,
        response && response.external_id
      ),
      sunat_status: docStatus || normalizedStatus,
      sunat_code: pickFirstText(data && data.sunat_code, data && data.code, response && response.code),
      sunat_message: pickFirstText(
        faults.length ? JSON.stringify(faults) : null,
        notes.length ? JSON.stringify(notes) : null,
        data && data.sunat_message,
        data && data.message,
        response && response.message
      ),
      xml_url: pickFirstText(getByIdDoc && getByIdDoc.xml, data && data.xml_url, links.xml, data && data.xml),
      cdr_url: pickFirstText(getByIdDoc && getByIdDoc.cdr, data && data.cdr_url, links.cdr, data && data.cdr),
      pdf_url: pickFirstText(data && data.pdf_url, links.pdf, data && data.pdf, inferredPdfUrl),
      qr_payload: pickFirstText(data && data.qr_payload, data && data.qr, links.qr),
    });
  } catch (error) {
    await upsertSaleReceiptBySaleIdSafe({
      sale_id: sale.sale_id,
      document_type: sale.document_type,
      series: receiptNumber.series,
      correlative: receiptNumber.correlative,
      issued_at: sale.confirmed_at || sale.created_at || null,
      provider: RECEIPT_PROVIDER_APISUNAT,
      sunat_status: 'error',
      sunat_message: pickFirstText(error && error.message, 'Receipt emission failed'),
    });

    console.warn(
      `[sales] APISUNAT receipt emission failed for sale ${sale.sale_id}: ${
        (error && error.message) || 'Unknown error'
      }`
    );

    return null;
  }
}

function buildCustomerName(customer) {
  return (
    normalizeText(customer.full_name) ||
    normalizeText(customer.business_name) ||
    normalizeText(customer.commercial_name) ||
    null
  );
}

async function resolveOperatingContext(userId) {
  const normalizedUserId = normalizeUuid(userId);

  if (!normalizedUserId) {
    throw new AppError('Not authenticated', 401);
  }

  const user = await findActiveUserById(normalizedUserId);
  if (!user) {
    throw new AppError('Not authenticated', 401);
  }

  const defaultLocation = await findDefaultLocationByUserId(normalizedUserId);
  if (!defaultLocation) {
    throw new AppError('Authenticated user has no default location assigned', 409);
  }

  if (!defaultLocation.active) {
    throw new AppError('Default location is inactive', 409);
  }

  return {
    user,
    location: defaultLocation,
  };
}

async function assertOpenCashForLocation(location, executor = null) {
  const businessDate = todayPeruDate();
  const cashClosing = await findCashClosingByLocationAndDate(
    location.location_id,
    businessDate,
    executor || undefined
  );

  if (!cashClosing) {
    throw new AppError(
      `No hay una caja abierta para ${location.name} en la fecha operativa de hoy. Abre caja antes de registrar ventas.`,
      409,
      { code: 'CASH_OPEN_REQUIRED' }
    );
  }

  if (cashClosing.status !== 'open') {
    throw new AppError(
      `La caja operativa de ${location.name} ya fue cerrada para hoy. No se pueden registrar más ventas en esa fecha operativa.`,
      409,
      { code: 'CASH_ALREADY_CLOSED_FOR_DATE' }
    );
  }

  return cashClosing;
}

async function resolveCustomerForSale(customerId) {
  if (customerId) {
    const customer = await findCustomerById(customerId);

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    if (!customer.active) {
      throw new AppError('Customer is inactive', 409);
    }

    return customer;
  }

  const fallbackCustomer = await findCustomerByInternalCode(GENERIC_COUNTER_CUSTOMER_CODE);
  if (!fallbackCustomer) {
    throw new AppError('Generic counter customer is not configured', 500);
  }

  if (!fallbackCustomer.active) {
    throw new AppError('Generic counter customer is inactive', 500);
  }

  return fallbackCustomer;
}

function validateCustomerAgainstDocumentType(customer, documentType) {
  const customerName = buildCustomerName(customer);
  const customerDocType = String(customer.document_type || '').toLowerCase();

  if (documentType === 'boleta') {
    if (!customerName) {
      throw new AppError('Customer name is required for boleta', 400);
    }

    if (!['dni', 'ce'].includes(customerDocType)) {
      throw new AppError('A customer with DNI or CE is required for boleta', 400);
    }

    if (!normalizeText(customer.document_number)) {
      throw new AppError('Customer document number is required for boleta', 400);
    }

    if (
      customerDocType === 'ce' &&
      !/^\d{9}$/.test(String(customer.document_number || '').trim())
    ) {
      throw new AppError('CE document number must have exactly 9 digits for boleta', 400);
    }
  }

  if (documentType === 'factura') {
    if (!customerName) {
      throw new AppError('Customer name is required for factura', 400);
    }

    if (customerDocType !== 'ruc') {
      throw new AppError('A customer with RUC is required for factura', 400);
    }

    if (!normalizeText(customer.document_number)) {
      throw new AppError('Customer document number is required for factura', 400);
    }

    if (!normalizeText(customer.address)) {
      throw new AppError('Customer address is required for factura', 400);
    }
  }
}

async function getSaleByLocation(saleId, locationId) {
  const normalizedId = normalizeUuid(saleId);
  if (!normalizedId) throw new AppError('Sale id is required', 400);

  const header = await findSaleById(normalizedId, locationId);
  if (!header) throw new AppError('Sale not found', 404);

  const [details, payments, receipt] = await Promise.all([
    findSaleDetailsBySaleId(normalizedId),
    findSalePaymentsBySaleId(normalizedId),
    getSaleReceiptBySaleIdSafe(normalizedId),
  ]);

  return {
    ...header,
    details,
    payments,
    receipt,
  };
}

async function listSellableVariants(input = {}) {
  const q = normalizeText(input.q);
  const { location } = await resolveOperatingContext(input.user_id);

  return findSellableVariants(location.location_id, q);
}

async function getPosContext(input = {}) {
  const { user, location } = await resolveOperatingContext(input.user_id);
  const businessDate = todayPeruDate();
  const cashClosing = await findCashClosingByLocationAndDate(location.location_id, businessDate);
  const wholesaleRule = await findActiveWholesaleMinQtyRule();

  let cashStatus = 'missing';
  let saleEnabled = false;
  let message =
    'No hay una caja abierta para la sede operativa de hoy. Abre caja antes de registrar ventas.';

  if (cashClosing) {
    if (cashClosing.status === 'open') {
      cashStatus = 'open';
      saleEnabled = true;
      message = 'Caja operativa abierta. La sede ya puede registrar ventas.';
    } else if (cashClosing.status === 'closed') {
      cashStatus = 'closed';
      message =
        'La caja operativa de hoy ya fue cerrada para esta sede. No se pueden registrar mas ventas en esta fecha.';
    }
  }

  return {
    business_date: businessDate,
    location,
    user: {
      user_id: user.user_id,
      full_name: user.full_name,
      role_name: user.role_name,
    },
    cash: {
      status: cashStatus,
      sale_enabled: saleEnabled,
      cash_closing_id: cashClosing ? cashClosing.cash_closing_id : null,
      message,
    },
    pricing: {
      wholesale_min_qty_total: wholesaleRule ? Number(wholesaleRule.min_qty) : null,
      wholesale_rule_type: wholesaleRule ? wholesaleRule.rule_type : null,
    },
  };
}

async function listSales(input = {}) {
  const status = normalizeText(input.status);
  const q = normalizeText(input.q);
  const customerQ = normalizeText(input.customer_q);
  const userQ = normalizeText(input.user_q);
  const cashStatus = normalizeText(input.cash_status);
  const documentType = normalizeText(input.document_type);
  const receiptStatus = normalizeText(input.receipt_status);
  const dateFrom = normalizeDate(input.date_from);
  const dateTo = normalizeDate(input.date_to);
  const legacyLimit = normalizeSalesPageSize(input.limit, 25);
  const legacyOffset = normalizeSalesOffset(input.offset);
  const pageSize = normalizeSalesPageSize(input.page_size, legacyLimit);
  const page = input.page ? normalizeSalesPage(input.page) : Math.floor(legacyOffset / pageSize) + 1;
  const cursor = normalizeSalesCursor(input.cursor);
  const { location } = await resolveOperatingContext(input.user_id);
  const offset = (page - 1) * pageSize;
  const limit = pageSize;

  if (status && !['draft', 'confirmed', 'cancelled'].includes(status)) {
    throw new AppError('Invalid status value', 400);
  }

  if (cashStatus && !['open', 'closed', 'missing'].includes(cashStatus)) {
    throw new AppError('Invalid cash_status value', 400);
  }

  if (documentType && !['none', 'proforma', 'boleta', 'factura'].includes(documentType)) {
    throw new AppError('Invalid document_type value', 400);
  }

  if (
    receiptStatus &&
    !['open', 'missing', 'pending', 'error', 'accepted', 'rejected', 'all'].includes(receiptStatus)
  ) {
    throw new AppError('Invalid receipt_status value', 400);
  }

  if (input.date_from !== undefined && input.date_from !== null && !dateFrom) {
    throw new AppError('Invalid date_from value', 400);
  }

  if (input.date_to !== undefined && input.date_to !== null && !dateTo) {
    throw new AppError('Invalid date_to value', 400);
  }

  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new AppError('date_from cannot be greater than date_to', 400);
  }

  const salesPage = await findAllSales({
    status,
    q,
    customerQ,
    userQ,
    cashStatus,
    documentType,
    receiptStatus,
    dateFrom,
    dateTo,
    page,
    pageSize,
    cursor,
    locationId: location.location_id,
    limit,
    offset,
  });

  return {
    items: salesPage.items,
    total:
      typeof salesPage.total === 'number'
        ? salesPage.total
        : salesPage.pagination?.total_count ?? salesPage.items.length,
    limit,
    offset,
    has_more:
      typeof salesPage.total === 'number'
        ? offset + salesPage.items.length < salesPage.total
        : Boolean(salesPage.pagination?.has_next),
    pagination: salesPage.pagination || {
      mode: 'page',
      cursor: null,
      next_cursor: null,
      page,
      page_size: pageSize,
      total_count: typeof salesPage.total === 'number' ? salesPage.total : salesPage.items.length,
      total_pages: 1,
      has_next: false,
      has_prev: page > 1,
    },
  };
}

async function listReceiptQueue(input = {}) {
  const queueStatus = (normalizeText(input.queue_status) || 'open').toLowerCase();
  const limit = normalizeReceiptQueueLimit(input.limit, 50);

  if (!RECEIPT_QUEUE_STATUS_FILTERS.includes(queueStatus)) {
    throw new AppError('Invalid queue_status value', 400);
  }

  const { location } = await resolveOperatingContext(input.user_id);

  return findReceiptQueue({
    locationId: location.location_id,
    status: queueStatus,
    limit,
  });
}

async function getCustomerAnalytics(input = {}) {
  const dateFrom = normalizeDate(input.date_from);
  const dateTo = normalizeDate(input.date_to);
  const limit = normalizeReceiptQueueLimit(input.limit, 8);

  if (input.date_from !== undefined && input.date_from !== null && !dateFrom) {
    throw new AppError('Invalid date_from value', 400);
  }

  if (input.date_to !== undefined && input.date_to !== null && !dateTo) {
    throw new AppError('Invalid date_to value', 400);
  }

  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new AppError('date_from cannot be greater than date_to', 400);
  }

  const { location } = await resolveOperatingContext(input.user_id);

  return findCustomerBiAnalytics({
    locationId: location.location_id,
    dateFrom,
    dateTo,
    limit,
  });
}

async function getSale(input = {}) {
  const { location } = await resolveOperatingContext(input.user_id);
  return getSaleByLocation(input.sale_id, location.location_id);
}

async function createSale(input = {}) {
  const documentType = normalizeText(input.document_type) || 'none';
  const paymentMethod = normalizeText(input.payment_method) || 'cash';
  const notes = normalizeText(input.notes);
  const customerId = normalizeUuid(input.customer_id);
  const items = Array.isArray(input.items) ? input.items : [];
  const saleDiscount = normalizeSaleDiscount(input.sale_discount);

  if (input.customer_id !== undefined && input.customer_id !== null && !customerId) {
    throw new AppError('Invalid customer_id', 400);
  }

  if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
    throw new AppError('Invalid document_type', 400);
  }

  if (!items.length) {
    throw new AppError('At least one item is required', 400);
  }

  const { user, location } = await resolveOperatingContext(input.user_id);
  const customer = await resolveCustomerForSale(customerId);
  validateCustomerAgainstDocumentType(customer, documentType);

  const normalizedItems = [];
  const seenVariantIds = new Set();

  for (const item of items) {
    const variantId = normalizeUuid(item && item.variant_id);
    const qty = normalizePositiveInteger(item && item.quantity);

    if (!variantId) {
      throw new AppError('variant_id is required for each item', 400);
    }

    if (!qty) {
      throw new AppError('quantity must be a positive integer for each item', 400);
    }

    if (seenVariantIds.has(variantId)) {
      throw new AppError('Duplicate variant_id in items is not allowed', 400);
    }

    const variant = await findVariantById(variantId);
    if (!variant) {
      throw new AppError(`Variant ${variantId} not found`, 404);
    }

    if (!variant.active) {
      throw new AppError(`Variant ${variant.sku} is inactive`, 400);
    }

    seenVariantIds.add(variantId);
    normalizedItems.push({
      variant_id: variant.variant_id,
      sku: variant.sku,
      style_id: variant.style_id,
      size_id: variant.size_id,
      quantity: qty,
      price_override: normalizePriceOverride(item && item.price_override),
    });
  }

  const client = await pool.connect();
  const totalQuantity = sumSaleItemQuantity(normalizedItems);

  try {
    await client.query('begin');
    const clientQuery = client.query.bind(client);
    await assertOpenCashForLocation(location, clientQuery);
    const wholesaleRule = await findActiveWholesaleMinQtyRule(clientQuery);
    const wholesaleApplies = shouldApplyWholesaleRule(totalQuantity, wholesaleRule);

    const confirmedAt = new Date().toISOString();
    const computedItems = [];
    let baseSubtotalAmount = 0;

    for (const item of normalizedItems) {
      const availableQty = await getInventoryQtyInTx(
        clientQuery,
        location.location_id,
        item.variant_id
      );

      if (availableQty < item.quantity) {
        throw new AppError(
          `Insufficient stock for ${item.sku}: available ${availableQty}, requested ${item.quantity}`,
          409
        );
      }

      const resolvedRetailPrice = normalizeAmount(
        await getCurrentRetailPriceInTx(clientQuery, item.style_id, item.size_id)
      );

      if (resolvedRetailPrice === null) {
        throw new AppError(`No current retail price found for ${item.sku}`, 409);
      }

      const resolvedWholesalePrice = wholesaleApplies
        ? normalizeAmount(
            await getCurrentWholesalePriceInTx(clientQuery, item.style_id, item.size_id)
          )
        : null;
      const autoUnitPrice =
        wholesaleApplies && resolvedWholesalePrice !== null
          ? resolvedWholesalePrice
          : resolvedRetailPrice;
      const autoPriceType =
        wholesaleApplies && resolvedWholesalePrice !== null ? 'wholesale' : 'retail';
      const autoPricingRuleApplied =
        wholesaleApplies && resolvedWholesalePrice !== null
          ? wholesaleRule.rule_type
          : null;

      const unitPriceBeforeDiscount = item.price_override
        ? item.price_override.unit_price_final
        : autoUnitPrice;
      const lineSubtotalBeforeDiscount = round2(unitPriceBeforeDiscount * item.quantity);
      baseSubtotalAmount += lineSubtotalBeforeDiscount;

      computedItems.push({
        ...item,
        unit_price_list: autoUnitPrice,
        unit_price_final: unitPriceBeforeDiscount,
        price_type_applied: autoPriceType,
        pricing_basis: item.price_override ? 'manual_override' : 'auto',
        pricing_rule_applied: autoPricingRuleApplied,
        override_reason: item.price_override ? item.price_override.reason : null,
        overridden_by: item.price_override ? user.user_id : null,
        overridden_at: item.price_override ? confirmedAt : null,
        line_subtotal_before_discount: lineSubtotalBeforeDiscount,
      });
    }

    baseSubtotalAmount = round2(baseSubtotalAmount);

    const taxRate = TAX_RATE_BY_DOCUMENT[documentType];
    const saleDiscountAmount = computeSaleDiscountAmount(saleDiscount, baseSubtotalAmount);
    const discountedItems = allocateSaleDiscountAcrossItems(computedItems, saleDiscountAmount);
    const pricedSale = applyTaxesToComputedItems(discountedItems, taxRate);
    const subtotalAmount = pricedSale.subtotalAmount;
    const taxAmount = pricedSale.taxAmount;
    const totalAmount = pricedSale.totalAmount;

    if (totalAmount <= 0) {
      throw new AppError('The final sale total must be greater than zero', 400);
    }

    const payments = normalizeSalePayments(input.payments, paymentMethod, totalAmount);

    const saleNumber = await nextSaleNumberInTx(clientQuery, documentType);

    const saleRow = await insertSale(clientQuery, {
      location_id: location.location_id,
      seller_user_id: user.user_id,
      customer_id: customer.customer_id,
      customer_name_text: buildCustomerName(customer),
      customer_doc_type: customer.document_type,
      customer_doc_number: normalizeText(customer.document_number),
      customer_address_text: normalizeText(customer.address),
      document_type: documentType,
      status: 'confirmed',
      notes,
      tax_rate: taxRate,
      subtotal_amount: subtotalAmount,
      sale_discount_amount: saleDiscountAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      sale_discount_reason: saleDiscountAmount > 0 && saleDiscount ? saleDiscount.reason : null,
      discounted_by: saleDiscountAmount > 0 ? user.user_id : null,
      discounted_at: saleDiscountAmount > 0 ? confirmedAt : null,
      sale_number: saleNumber,
      confirmed_at: confirmedAt,
      currency: 'PEN',
    });

    const saleId = saleRow.sale_id;

    for (const item of pricedSale.items) {
      await insertSaleDetail(clientQuery, {
        sale_id: saleId,
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price_list: item.unit_price_list,
        unit_price_final: item.unit_price_final,
        price_type_applied: item.price_type_applied,
        pricing_basis: item.pricing_basis,
        pricing_rule_applied: item.pricing_rule_applied || null,
        override_reason: item.override_reason,
        overridden_by: item.overridden_by,
        overridden_at: item.overridden_at,
        line_subtotal: item.line_subtotal,
        line_tax: item.line_tax,
        line_total: item.line_total,
      });

      await decrementInventoryInTx(clientQuery, location.location_id, item.variant_id, item.quantity);

      await insertStockMovementInTx(clientQuery, {
        location_id: location.location_id,
        variant_id: item.variant_id,
        movement_type: 'OUT',
        quantity: item.quantity,
        reason: `Venta ${saleNumber}`,
        reference_type: 'sale',
        reference_id: saleId,
        created_by: user.user_id,
      });
    }

    for (const payment of payments) {
      await insertSalePayment(clientQuery, {
        sale_id: saleId,
        method: payment.method,
        amount: payment.amount,
        reference: payment.reference,
      });
    }

    await client.query('commit');

    const createdSale = await getSaleByLocation(saleId, location.location_id);

    if (!isReceiptDocumentType(documentType)) {
      return createdSale;
    }

    await syncReceiptForConfirmedSale(createdSale);

    return getSaleByLocation(saleId, location.location_id);
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function retrySaleReceipt(input = {}) {
  const saleId = normalizeUuid(input.sale_id);

  if (!saleId) {
    throw new AppError('Sale id is required', 400);
  }

  const { location } = await resolveOperatingContext(input.user_id);
  const sale = await getSaleByLocation(saleId, location.location_id);

  if (!isReceiptDocumentType(sale.document_type)) {
    throw new AppError('Only boleta/factura can be retried for receipt emission', 400);
  }

  await syncReceiptForConfirmedSale(sale);
  return getSaleByLocation(saleId, location.location_id);
}

async function processPendingReceiptQueue(options = {}) {
  if (receiptRetryJobRunning) {
    return {
      skipped: true,
      reason: 'already-running',
      processed: 0,
      failed: 0,
    };
  }

  if (!env.apiSunatEnabled) {
    return {
      skipped: true,
      reason: 'apisunat-disabled',
      processed: 0,
      failed: 0,
    };
  }

  receiptRetryJobRunning = true;

  try {
    const limit = normalizeReceiptQueueLimit(options.limit, env.apiSunatRetryBatchSize || 20);
    const queuedReceipts = await findReceiptQueue({ status: 'open', limit });

    let processed = 0;
    let failed = 0;

    for (const queued of queuedReceipts) {
      try {
        const sale = await getSaleByLocation(queued.sale_id, null);
        await syncReceiptForConfirmedSale(sale);
        processed += 1;
      } catch (error) {
        failed += 1;
        console.warn(
          `[sales] Pending receipt retry failed for sale ${queued.sale_id}: ${
            (error && error.message) || 'Unknown error'
          }`
        );
      }
    }

    return {
      skipped: false,
      processed,
      failed,
      total: queuedReceipts.length,
    };
  } finally {
    receiptRetryJobRunning = false;
  }
}

async function getSalePdfLink(input = {}) {
  const { location } = await resolveOperatingContext(input.user_id);
  let sale = await getSaleByLocation(input.sale_id, location.location_id);

  if (!isReceiptDocumentType(sale.document_type)) {
    throw new AppError('Only boleta/factura receipts can be downloaded from APISUNAT', 400);
  }

  const receipt = sale.receipt || null;

  if (!receipt || !receipt.pdf_url) {
    await syncReceiptForConfirmedSale(sale);
    sale = await getSaleByLocation(input.sale_id, location.location_id);
  }

  if (!sale.receipt || !sale.receipt.pdf_url) {
    throw new AppError('SUNAT PDF is not available yet for this sale', 409);
  }

  return {
    pdfUrl: sale.receipt.pdf_url,
  };
}

async function getSaleProformaPdf(input = {}) {
  const { location } = await resolveOperatingContext(input.user_id);
  const sale = await getSaleByLocation(input.sale_id, location.location_id);

  if (sale.document_type !== 'proforma') {
    throw new AppError('Only proforma sales can be downloaded from this endpoint', 400);
  }

  const pdfBuffer = await renderProformaSalePdfBuffer(sale);
  const fileNameBase = String(sale.sale_number || sale.sale_id || 'proforma')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'proforma';

  return {
    fileName: `${fileNameBase}.pdf`,
    pdfBuffer,
  };
}

module.exports = {
  getPosContext,
  listSellableVariants,
  listSales,
  listReceiptQueue,
  getCustomerAnalytics,
  getSale,
  createSale,
  retrySaleReceipt,
  processPendingReceiptQueue,
  getSalePdfLink,
  getSaleProformaPdf,
};
