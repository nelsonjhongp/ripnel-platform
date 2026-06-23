const { pool } = require('../../shared/db');
const { AppError } = require('../../shared/errors');
const { round2 } = require('../../shared/numbers');
const { normalizeUuid } = require('../../shared/uuid');
const { findActiveUserById } = require('../auth/auth.repo');
const { findDefaultLocationByUserId } = require('../users/users.repo');
const {
  findEligibleSales,
  findSaleSummaryById,
  findSaleDetailsBySaleId,
  findSalePaymentsBySaleId,
  findPaymentReversalsBySaleId,
  findSaleCancellationBySaleId,
  findExchangesBySaleId,
  findExchangeLinesBySaleId,
  findVariantById,
  getCurrentRetailPriceInTx,
  getInventoryQtyInTx,
  findCashClosingByLocationAndDate,
  nextExchangeNumberInTx,
  insertExchange,
  insertExchangeLine,
  updateExchangeSettlementPayment,
  cancelSaleInTx,
  insertSaleCancellation,
  insertPaymentReversal,
  upsertInventoryQty,
  insertStockMovement,
} = require('./postsales.repo');
const { insertSalePayment } = require('../sales/sales.repo');

const ALLOWED_SALE_STATUSES = ['confirmed', 'draft', 'cancelled'];
const ALLOWED_PAYMENT_METHODS = ['cash', 'yape', 'plin', 'transfer'];

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

function normalizePositiveInteger(value, fallback = null) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function isCloseEnough(left, right) {
  return Math.abs(round2(left) - round2(right)) < 0.01;
}

function todayPeruDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}

function sanitizeCashStatus(value) {
  if (value === 'open' || value === 'closed') {
    return value;
  }

  return 'missing';
}

function buildCancellationCashReason(cashStatus) {
  if (cashStatus === 'closed') {
    return 'La caja operativa de la sede para el día de la venta ya fue cerrada.';
  }

  return 'La caja operativa de la sede para el día de la venta no está abierta.';
}

function buildAvailability({ sale, details, cancellation, confirmedExchangeCount }) {
  const exchangeReasons = [];
  const cancelReasons = [];
  const cashStatus = sanitizeCashStatus(sale.cash_status);

  if (sale.status !== 'confirmed') {
    const statusReason =
      sale.status === 'cancelled'
        ? 'La venta ya se encuentra anulada.'
        : 'Solo las ventas confirmadas pueden pasar por postventa.';
    exchangeReasons.push(statusReason);
    cancelReasons.push(statusReason);
  }

  if (!Array.isArray(details) || details.length === 0) {
    exchangeReasons.push('La venta no tiene líneas operativas para procesar postventa.');
    cancelReasons.push('La venta no tiene líneas operativas para procesar postventa.');
  }

  if (cancellation) {
    exchangeReasons.push('La venta ya registra una anulación controlada.');
    cancelReasons.push('La venta ya registra una anulación controlada.');
  }

  const hasRemainingUnits = Array.isArray(details) && details.some(
    (line) => (line.quantity - (Number(line.exchanged_qty) || 0)) > 0
  );

  if (!hasRemainingUnits) {
    exchangeReasons.push('Todas las unidades de esta venta ya fueron cambiadas.');
  }

  if (confirmedExchangeCount > 0) {
    cancelReasons.push('No se puede anular una venta que ya tiene cambios registrados.');
  }

  if (cashStatus !== 'open') {
    cancelReasons.push(buildCancellationCashReason(cashStatus));
  }

  return {
    exchange: {
      allowed: exchangeReasons.length === 0,
      reasons: exchangeReasons,
    },
    cancel: {
      allowed: cancelReasons.length === 0,
      reasons: cancelReasons,
    },
  };
}

function attachExchangeLines(exchanges, lines) {
  const linesByExchangeId = new Map();

  for (const line of lines) {
    if (!linesByExchangeId.has(line.exchange_id)) {
      linesByExchangeId.set(line.exchange_id, []);
    }

    linesByExchangeId.get(line.exchange_id).push(line);
  }

  return exchanges.map((exchange) => ({
    ...exchange,
    lines: linesByExchangeId.get(exchange.exchange_id) || [],
  }));
}

async function resolveOperatingContext(userId) {
  const normalizedUserId = normalizeUuid(userId);

  if (!normalizedUserId) {
    throw new AppError('No autenticado', 401, { code: 'AUTH_REQUIRED' });
  }

  const user = await findActiveUserById(normalizedUserId);
  if (!user) {
    throw new AppError('No autenticado', 401, { code: 'AUTH_REQUIRED' });
  }

  const location = await findDefaultLocationByUserId(normalizedUserId);
  if (!location) {
    throw new AppError('El usuario autenticado no tiene una sede default asignada', 409, {
      code: 'DEFAULT_LOCATION_REQUIRED',
    });
  }

  if (!location.active) {
    throw new AppError('La sede default del usuario está inactiva', 409, {
      code: 'DEFAULT_LOCATION_INACTIVE',
    });
  }

  return {
    user,
    location,
  };
}

async function loadPostsaleContext(saleId, locationId, executor) {
  const sale = await findSaleSummaryById(saleId, locationId, executor);
  if (!sale) {
    throw new AppError('Venta no encontrada', 404, { code: 'SALE_NOT_FOUND' });
  }

  const [details, payments, paymentReversals, cancellation, exchanges, exchangeLines] =
    await Promise.all([
      findSaleDetailsBySaleId(saleId, executor),
      findSalePaymentsBySaleId(saleId, executor),
      findPaymentReversalsBySaleId(saleId, executor),
      findSaleCancellationBySaleId(saleId, executor),
      findExchangesBySaleId(saleId, executor),
      findExchangeLinesBySaleId(saleId, executor),
    ]);

  const confirmedExchangeCount =
    typeof sale.confirmed_exchange_count === 'number'
      ? sale.confirmed_exchange_count
      : Number(sale.confirmed_exchange_count || 0);

  return {
    sale: {
      ...sale,
      cash_status: sanitizeCashStatus(sale.cash_status),
      details,
      payments,
    },
    payment_reversals: paymentReversals,
    cancellation,
    exchanges: attachExchangeLines(exchanges, exchangeLines),
    cash_closing: sale.cash_closing_id
      ? {
          cash_closing_id: sale.cash_closing_id,
          business_date: sale.business_date,
          status: sanitizeCashStatus(sale.cash_status),
        }
      : null,
    availability: buildAvailability({
      sale,
      details,
      cancellation,
      confirmedExchangeCount,
    }),
  };
}

function assertChangeAllowed(context) {
  if (!context.availability.exchange.allowed) {
    throw new AppError(
      context.availability.exchange.reasons[0] || 'La venta no permite registrar cambios.',
      409,
      { code: 'POSTSALE_EXCHANGE_BLOCKED', details: context.availability.exchange.reasons }
    );
  }
}

function assertCancellationAllowed(context) {
  if (!context.availability.cancel.allowed) {
    throw new AppError(
      context.availability.cancel.reasons[0] || 'La venta no permite anulación controlada.',
      409,
      { code: 'POSTSALE_CANCEL_BLOCKED', details: context.availability.cancel.reasons }
    );
  }
}

function assertLockedAvailability({ sale, details, cancellation }, action) {
  const lockedAvailability = buildAvailability({
    sale,
    details,
    cancellation,
    confirmedExchangeCount: Number(sale.confirmed_exchange_count || 0),
  });

  if (action === 'exchange' && !lockedAvailability.exchange.allowed) {
    throw new AppError(
      lockedAvailability.exchange.reasons[0] || 'La venta no permite registrar cambios.',
      409,
      { code: 'POSTSALE_EXCHANGE_BLOCKED', details: lockedAvailability.exchange.reasons }
    );
  }

  if (action === 'cancel' && !lockedAvailability.cancel.allowed) {
    throw new AppError(
      lockedAvailability.cancel.reasons[0] || 'La venta no permite anulación controlada.',
      409,
      { code: 'POSTSALE_CANCEL_BLOCKED', details: lockedAvailability.cancel.reasons }
    );
  }
}

async function listEligiblePostsales(input = {}) {
  const { location } = await resolveOperatingContext(input.user_id);
  const q = normalizeText(input.q);
  const status = normalizeText(input.status);
  const dateFrom = normalizeDate(input.date_from);
  const dateTo = normalizeDate(input.date_to);
  const limit = Math.min(normalizePositiveInteger(input.limit, 100), 100);

  if (status && !ALLOWED_SALE_STATUSES.includes(status)) {
    throw new AppError('El filtro status no es válido', 400, { code: 'INVALID_STATUS' });
  }

  if (input.date_from !== undefined && input.date_from !== null && !dateFrom) {
    throw new AppError('date_from no tiene un formato válido', 400, { code: 'INVALID_DATE_FROM' });
  }

  if (input.date_to !== undefined && input.date_to !== null && !dateTo) {
    throw new AppError('date_to no tiene un formato válido', 400, { code: 'INVALID_DATE_TO' });
  }

  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new AppError('date_from no puede ser mayor que date_to', 400, {
      code: 'INVALID_DATE_RANGE',
    });
  }

  const sales = await findEligibleSales({
    locationId: location.location_id,
    q,
    status,
    dateFrom,
    dateTo,
    limit,
  });

  return sales.map((sale) => {
    const availability = buildAvailability({
      sale,
      details: [{}],
      cancellation: sale.sale_cancellation_id ? { sale_cancellation_id: sale.sale_cancellation_id } : null,
      confirmedExchangeCount: Number(sale.confirmed_exchange_count || 0),
    });

    return {
      ...sale,
      cash_status: sanitizeCashStatus(sale.cash_status),
      availability,
    };
  });
}

async function getPostsaleContext(input = {}) {
  const saleId = normalizeUuid(input.sale_id);
  if (!saleId) {
    throw new AppError('sale_id es obligatorio', 400, { code: 'INVALID_SALE_ID' });
  }

  const { location } = await resolveOperatingContext(input.user_id);
  return loadPostsaleContext(saleId, location.location_id);
}

async function createSimpleExchange(input = {}) {
  const saleId = normalizeUuid(input.sale_id);
  const saleDetailId = normalizeUuid(input.sale_detail_id);
  const replacementVariantId = normalizeUuid(input.replacement_variant_id);
  const reason = normalizeText(input.reason);
  const notes = normalizeText(input.notes);
  const paymentMethod = normalizeText(input.payment_method);
  const paymentReference = normalizeText(input.payment_reference);
  const exchangeQty = Number.isFinite(Number(input.quantity)) && Number(input.quantity) > 0
    ? Math.round(Number(input.quantity))
    : null;

  if (!saleId) {
    throw new AppError('sale_id es obligatorio', 400, { code: 'INVALID_SALE_ID' });
  }

  if (!saleDetailId) {
    throw new AppError('sale_detail_id es obligatorio', 400, {
      code: 'INVALID_SALE_DETAIL_ID',
    });
  }

  if (!replacementVariantId) {
    throw new AppError('replacement_variant_id es obligatorio', 400, {
      code: 'INVALID_REPLACEMENT_VARIANT_ID',
    });
  }

  if (!reason) {
    throw new AppError('El motivo es obligatorio para registrar el cambio.', 400, {
      code: 'POSTSALE_REASON_REQUIRED',
    });
  }

  const { user, location } = await resolveOperatingContext(input.user_id);
  const client = await pool.connect();

  try {
    await client.query('begin');
    const executor = client.query.bind(client);

    const context = await loadPostsaleContext(saleId, location.location_id, executor);
    assertChangeAllowed(context);

    const sale = await findSaleSummaryById(saleId, location.location_id, executor, {
      forUpdate: true,
    });
    const saleDetails = await findSaleDetailsBySaleId(saleId, executor);
    const lockedCancellation = sale.sale_cancellation_id
      ? { sale_cancellation_id: sale.sale_cancellation_id }
      : null;

    assertLockedAvailability({
      sale,
      details: saleDetails,
      cancellation: lockedCancellation,
    }, 'exchange');

    const originalLine = saleDetails.find((line) => line.sale_detail_id === saleDetailId);

    if (!originalLine) {
      throw new AppError('La línea de venta indicada no pertenece a la venta.', 404, {
        code: 'SALE_DETAIL_NOT_FOUND',
      });
    }

    if (originalLine.variant_id === replacementVariantId) {
      throw new AppError('El reemplazo debe ser una variante distinta a la original.', 400, {
        code: 'REPLACEMENT_VARIANT_SAME_AS_ORIGINAL',
      });
    }

    const lineQty = Number(originalLine.quantity || 0);
    const alreadyExchanged = Number(originalLine.exchanged_qty) || 0;
    const remainingQty = lineQty - alreadyExchanged;
    const effectiveQty = exchangeQty !== null ? exchangeQty : remainingQty;

    if (effectiveQty < 1 || effectiveQty > remainingQty) {
      throw new AppError(
        `Cantidad a cambiar inválida. La línea tiene ${lineQty} unidades, ${alreadyExchanged} ya fueron cambiadas, ${remainingQty} disponibles.`,
        400,
        { code: 'INVALID_EXCHANGE_QUANTITY' }
      );
    }

    const replacementVariant = await findVariantById(replacementVariantId, executor);
    if (!replacementVariant) {
      throw new AppError('La variante de reemplazo no existe.', 404, {
        code: 'REPLACEMENT_VARIANT_NOT_FOUND',
      });
    }

    if (!replacementVariant.active) {
      throw new AppError('La variante de reemplazo está inactiva.', 409, {
        code: 'REPLACEMENT_VARIANT_INACTIVE',
      });
    }

    const [originalQty, replacementQty, replacementUnitPrice] = await Promise.all([
      getInventoryQtyInTx(executor, sale.location_id, originalLine.variant_id, { forUpdate: true }),
      getInventoryQtyInTx(executor, sale.location_id, replacementVariant.variant_id, {
        forUpdate: true,
      }),
      getCurrentRetailPriceInTx(executor, replacementVariant.style_id, replacementVariant.size_id),
    ]);

    if (replacementQty < effectiveQty) {
      throw new AppError('No hay stock suficiente para la variante de reemplazo.', 409, {
        code: 'REPLACEMENT_STOCK_INSUFFICIENT',
      });
    }

    if (replacementUnitPrice === null || replacementUnitPrice === undefined) {
      throw new AppError('La variante de reemplazo no tiene precio retail vigente.', 409, {
        code: 'REPLACEMENT_PRICE_NOT_FOUND',
      });
    }

    const replacementSubtotal = round2(Number(replacementUnitPrice) * effectiveQty);
    const replacementTax = round2(replacementSubtotal * Number(sale.tax_rate || 0));
    const replacementTotal = round2(replacementSubtotal + replacementTax);

    const originalSubtotal = round2(
      Number(originalLine.line_subtotal || 0) * (effectiveQty / lineQty)
    );
    const originalTax = round2(
      Number(originalLine.line_tax || 0) * (effectiveQty / lineQty)
    );
    const proportionalLineTotal = round2(
      Number(originalLine.line_total || 0) * (effectiveQty / lineQty)
    );
    const differenceAmount = round2(replacementTotal - proportionalLineTotal);
    const settlementType = isCloseEnough(differenceAmount, 0)
      ? 'none'
      : differenceAmount > 0
        ? 'charge'
        : 'refund_pending';

    if (settlementType === 'refund_pending') {
      throw new AppError(
        'El reemplazo tiene menor valor. Esta version requiere devolucion o credito interno para completar el cambio.',
        409,
        { code: 'POSTSALE_EXCHANGE_REFUND_OR_CREDIT_REQUIRED' }
      );
    }

    if (settlementType === 'charge') {
      if (!paymentMethod || !ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
        throw new AppError('Selecciona un metodo de pago para cobrar la diferencia.', 400, {
          code: 'POSTSALE_EXCHANGE_PAYMENT_METHOD_REQUIRED',
        });
      }

      const cashClosing = await findCashClosingByLocationAndDate(
        sale.location_id,
        todayPeruDate(),
        executor
      );

      if (!cashClosing || cashClosing.status !== 'open') {
        throw new AppError(
          'La caja operativa de hoy debe estar abierta para cobrar la diferencia del cambio.',
          409,
          { code: 'POSTSALE_EXCHANGE_CASH_REQUIRED' }
        );
      }
    }

    const exchangeNumber = await nextExchangeNumberInTx(executor);
    const exchange = await insertExchange(
      {
        exchange_number: exchangeNumber,
        sale_id: saleId,
        location_id: sale.location_id,
        status: 'confirmed',
        reason,
        notes,
        original_total: proportionalLineTotal,
        replacement_total: replacementTotal,
        difference_amount: differenceAmount,
        settlement_type: settlementType,
        created_by: user.user_id,
        confirmed_by: user.user_id,
      },
      executor
    );

    const exchangeLineIn = await insertExchangeLine(
      {
        exchange_id: exchange.exchange_id,
        direction: 'IN',
        variant_id: originalLine.variant_id,
        quantity: effectiveQty,
        unit_reference_price: originalLine.unit_price_final,
        unit_price_list: originalLine.unit_price_list,
        unit_price_final: originalLine.unit_price_final,
        line_subtotal: originalSubtotal,
        line_tax: originalTax,
        line_total: proportionalLineTotal,
        price_source: 'original_sale',
        sale_detail_id: saleDetailId,
        notes: `Devuelto por cambio de ${sale.sale_number || sale.sale_id}`,
      },
      executor
    );

    const exchangeLineOut = await insertExchangeLine(
      {
        exchange_id: exchange.exchange_id,
        direction: 'OUT',
        variant_id: replacementVariant.variant_id,
        quantity: effectiveQty,
        unit_reference_price: replacementUnitPrice,
        unit_price_list: replacementUnitPrice,
        unit_price_final: replacementUnitPrice,
        line_subtotal: replacementSubtotal,
        line_tax: replacementTax,
        line_total: replacementTotal,
        price_source: 'current_retail',
        sale_detail_id: saleDetailId,
        notes: `Entregado por cambio de ${sale.sale_number || sale.sale_id}`,
      },
      executor
    );

    await upsertInventoryQty(
      sale.location_id,
      originalLine.variant_id,
      originalQty + effectiveQty,
      executor
    );

    await upsertInventoryQty(
      sale.location_id,
      replacementVariant.variant_id,
      replacementQty - effectiveQty,
      executor
    );

    await insertStockMovement(
      {
        location_id: sale.location_id,
        variant_id: originalLine.variant_id,
        movement_type: 'IN',
        quantity: effectiveQty,
        reason: `Cambio simple ${exchangeNumber}`,
        reference_type: 'exchange',
        reference_id: exchange.exchange_id,
        reference_line_id: exchangeLineIn.exchange_line_id,
        created_by: user.user_id,
      },
      executor
    );

    await insertStockMovement(
      {
        location_id: sale.location_id,
        variant_id: replacementVariant.variant_id,
        movement_type: 'OUT',
        quantity: effectiveQty,
        reason: `Cambio simple ${exchangeNumber}`,
        reference_type: 'exchange',
        reference_id: exchange.exchange_id,
        reference_line_id: exchangeLineOut.exchange_line_id,
        created_by: user.user_id,
      },
      executor
    );

    if (settlementType === 'charge') {
      const payment = await insertSalePayment(executor, {
        sale_id: saleId,
        method: paymentMethod,
        amount: differenceAmount,
        reference: paymentReference || `Diferencia ${exchangeNumber}`,
      });

      if (payment && payment.payment_id) {
        await updateExchangeSettlementPayment(exchange.exchange_id, payment.payment_id, executor);
      }
    }

    await client.query('commit');
    return loadPostsaleContext(saleId, location.location_id);
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function cancelSale(input = {}) {
  const saleId = normalizeUuid(input.sale_id);
  const reason = normalizeText(input.reason);
  const notes = normalizeText(input.notes);

  if (!saleId) {
    throw new AppError('sale_id es obligatorio', 400, { code: 'INVALID_SALE_ID' });
  }

  if (!reason) {
    throw new AppError('El motivo es obligatorio para anular la venta.', 400, {
      code: 'POSTSALE_REASON_REQUIRED',
    });
  }

  const { user, location } = await resolveOperatingContext(input.user_id);
  const client = await pool.connect();

  try {
    await client.query('begin');
    const executor = client.query.bind(client);

    const context = await loadPostsaleContext(saleId, location.location_id, executor);
    assertCancellationAllowed(context);

    const sale = await findSaleSummaryById(saleId, location.location_id, executor, {
      forUpdate: true,
    });

    const [details, payments, cashClosing] = await Promise.all([
      findSaleDetailsBySaleId(saleId, executor),
      findSalePaymentsBySaleId(saleId, executor),
      findCashClosingByLocationAndDate(sale.location_id, sale.business_date, executor),
    ]);

    const lockedCancellation = sale.sale_cancellation_id
      ? { sale_cancellation_id: sale.sale_cancellation_id }
      : null;

    assertLockedAvailability({
      sale,
      details,
      cancellation: lockedCancellation,
    }, 'cancel');

    if (!cashClosing || cashClosing.status !== 'open') {
      throw new AppError(buildCancellationCashReason(sanitizeCashStatus(cashClosing && cashClosing.status)), 409, {
        code: 'POSTSALE_CASH_BLOCKED',
      });
    }

    await cancelSaleInTx(saleId, user.user_id, executor);

    await insertSaleCancellation(
      {
        sale_id: saleId,
        location_id: sale.location_id,
        reason,
        notes,
        cancelled_by: user.user_id,
      },
      executor
    );

    for (const payment of payments) {
      await insertPaymentReversal(
        {
          payment_id: payment.payment_id,
          sale_id: saleId,
          location_id: sale.location_id,
          method: payment.method,
          amount: payment.amount,
          reason,
          notes,
          reversed_by: user.user_id,
        },
        executor
      );
    }

    for (const detail of details) {
      const currentQty = await getInventoryQtyInTx(executor, sale.location_id, detail.variant_id, {
        forUpdate: true,
      });

      await upsertInventoryQty(
        sale.location_id,
        detail.variant_id,
        currentQty + Number(detail.quantity || 0),
        executor
      );

      await insertStockMovement(
        {
          location_id: sale.location_id,
          variant_id: detail.variant_id,
          movement_type: 'IN',
          quantity: detail.quantity,
          reason: `Anulación controlada ${sale.sale_number || sale.sale_id}`,
          reference_type: 'sale',
          reference_id: saleId,
          reference_line_id: detail.sale_detail_id,
          created_by: user.user_id,
        },
        executor
      );
    }

    await client.query('commit');
    return loadPostsaleContext(saleId, location.location_id);
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  listEligiblePostsales,
  getPostsaleContext,
  createSimpleExchange,
  cancelSale,
};
