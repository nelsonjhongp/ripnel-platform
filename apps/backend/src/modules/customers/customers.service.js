const { AppError } = require('../../shared/errors');
const { findAllCustomers, findCustomerById, createCustomer, updateCustomer, deleteCustomerById } = require('./customers.repo');

const ALLOWED_DOCUMENT_TYPES = ['none', 'dni', 'ruc', 'ce', 'passport'];
const ALLOWED_CUSTOMER_TYPES = ['retail', 'wholesale'];

const DOCUMENT_RULES = {
  dni: { label: 'DNI', regex: /^\d{8}$/ },
  ruc: { label: 'RUC', regex: /^\d{11}$/ },
  ce: { label: 'CE', regex: /^[A-Za-z0-9]{9,12}$/ },
  passport: { label: 'pasaporte', regex: /^[A-Za-z0-9]{6,15}$/ },
};

function cleanText(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
}

function normalizeActive(value, fallback) {
  if (value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new AppError('Invalid active value', 400);
}

function normalizeDocument({ documentTypeInput, documentNumberInput }) {
  const document_type = cleanText(documentTypeInput) || 'none';

  if (!ALLOWED_DOCUMENT_TYPES.includes(document_type)) {
    throw new AppError('Invalid document_type value', 400);
  }

  if (document_type === 'none') {
    if (documentNumberInput === undefined || documentNumberInput === null || String(documentNumberInput).trim() === '') {
      return { document_type: 'none', document_number: null };
    }
    throw new AppError('Document number must be empty when document_type is none', 400);
  }

  const document_number = cleanText(documentNumberInput);
  if (!document_number) {
    throw new AppError('Document number is required for selected document_type', 400);
  }

  const normalizedDocNumber = document_type === 'passport' ? document_number.toUpperCase() : document_number;
  const rule = DOCUMENT_RULES[document_type];

  if (!rule.regex.test(normalizedDocNumber)) {
    throw new AppError(`Invalid ${rule.label} format`, 400);
  }

  return { document_type, document_number: normalizedDocNumber };
}

function mapDatabaseError(error) {
  if (error && error.code === '23505') {
    const message = String(error.detail || error.message || '');
    if (error.constraint === 'uq_customers_document' || message.includes('(document_type, document_number)')) {
      throw new AppError('Document already exists for another customer', 409);
    }
  }

  throw error;
}

async function listCustomers({ documentType, sort, q, page, limit }) {
  const docType = documentType && documentType !== 'all' ? documentType : null;

  if (docType && !ALLOWED_DOCUMENT_TYPES.includes(docType)) {
    throw new AppError('Invalid document_type filter', 400);
  }

  const sortOrder = sort === 'asc' ? 'asc' : 'desc';

  return findAllCustomers({ documentType: docType, sort: sortOrder, q: cleanText(q), page, limit });
}

async function patchCustomer(customerId, input) {
  const normalizedId = String(customerId || '').trim();

  if (!normalizedId) {
    throw new AppError('Customer id is required', 400);
  }

  const existing = await findCustomerById(normalizedId);

  if (!existing) {
    throw new AppError('Customer not found', 404);
  }

  const EDITABLE = [
    'document_type',
    'document_number',
    'full_name',
    'business_name',
    'commercial_name',
    'email',
    'phone',
    'customer_type',
    'active',
    'notes',
  ];
  const hasEditable = EDITABLE.some((f) => f in input);

  if (!hasEditable) {
    throw new AppError('No editable fields provided', 400);
  }

  const full_name = 'full_name' in input ? cleanText(input.full_name) : existing.full_name;
  const business_name = 'business_name' in input ? cleanText(input.business_name) : existing.business_name;
  const commercial_name = 'commercial_name' in input ? cleanText(input.commercial_name) : existing.commercial_name;
  const email = 'email' in input ? cleanText(input.email) : existing.email;
  const phone = 'phone' in input ? cleanText(input.phone) : existing.phone;
  const address = 'address' in input ? cleanText(input.address) : existing.address;
  const notes = 'notes' in input ? cleanText(input.notes) : existing.notes;
  const active = normalizeActive(input.active, existing.active);

  const resolvedDocumentType = 'document_type' in input ? input.document_type : existing.document_type;
  const resolvedDocumentNumber = 'document_number' in input ? input.document_number : existing.document_number;
  const { document_type, document_number } = normalizeDocument({
    documentTypeInput: resolvedDocumentType,
    documentNumberInput: resolvedDocumentNumber,
  });

  let customer_type = existing.customer_type;
  if ('customer_type' in input) {
    if (!ALLOWED_CUSTOMER_TYPES.includes(input.customer_type)) {
      throw new AppError('Invalid customer_type value', 400);
    }
    customer_type = input.customer_type;
  }

  if (!full_name && !business_name && !commercial_name) {
    throw new AppError('Provide at least one name field (full_name, business_name or commercial_name)', 400);
  }

  try {
    return await updateCustomer({
      customerId: normalizedId,
      document_type,
      document_number,
      full_name,
      business_name,
      commercial_name,
      email,
      phone,
      address,
      customer_type,
      active,
      notes,
    });
  } catch (error) {
    mapDatabaseError(error);
  }
}

async function createNewCustomer(input) {
  const { document_type, document_number } = normalizeDocument({
    documentTypeInput: input.document_type,
    documentNumberInput: input.document_number,
  });

  const full_name = cleanText(input.full_name);
  const business_name = cleanText(input.business_name);
  const commercial_name = cleanText(input.commercial_name);
  const email = cleanText(input.email);
  const phone = cleanText(input.phone);
  const address = cleanText(input.address);
  const notes = cleanText(input.notes);
  const active = normalizeActive(input.active, true);
  const customer_type = cleanText(input.customer_type) || 'retail';

  if (!ALLOWED_CUSTOMER_TYPES.includes(customer_type)) {
    throw new AppError('Invalid customer_type value', 400);
  }

  if (!full_name && !business_name && !commercial_name) {
    throw new AppError('Provide at least one name field (full_name, business_name or commercial_name)', 400);
  }

  try {
    return await createCustomer({
      document_type,
      document_number,
      full_name,
      business_name,
      commercial_name,
      email,
      phone,
      address,
      customer_type,
      active,
      notes,
    });
  } catch (error) {
    mapDatabaseError(error);
  }
}

async function removeCustomer(customerId) {
  const normalizedId = String(customerId || '').trim();

  if (!normalizedId) {
    throw new AppError('Customer id is required', 400);
  }

  const deleted = await deleteCustomerById(normalizedId);

  if (!deleted) {
    throw new AppError('Customer not found', 404);
  }

  return { customer_id: deleted.customer_id };
}

module.exports = { listCustomers, createNewCustomer, patchCustomer, removeCustomer };
