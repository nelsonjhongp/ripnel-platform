const { AppError } = require('../../shared/errors');
const {
  findAllPricingRules,
  findPricingRuleById,
  insertPricingRule,
  updatePricingRule,
} = require('./pricing-rules.repo');

function normalizeDate(dateValue) {
  if (!dateValue) {
    return null;
  }

  const normalized = String(dateValue).trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeRuleType(value) {
  return String(value || '').trim().toUpperCase();
}

function coerceMinQty(value) {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
}

async function listPricingRules() {
  return findAllPricingRules();
}

async function createPricingRule(input) {
  const ruleType = normalizeRuleType(input.rule_type);
  const minQty = coerceMinQty(input.min_qty);
  const active = typeof input.active === 'boolean' ? input.active : true;
  const validFrom = normalizeDate(input.valid_from);
  const validTo = normalizeDate(input.valid_to);

  if (!ruleType) {
    throw new AppError('Rule type is required', 400);
  }

  if (ruleType.length > 60) {
    throw new AppError('Rule type is too long', 400);
  }

  if (minQty === null) {
    throw new AppError('Minimum quantity is invalid', 400);
  }

  if (input.valid_from && !validFrom) {
    throw new AppError('Valid from date is invalid', 400);
  }

  if (input.valid_to && !validTo) {
    throw new AppError('Valid to date is invalid', 400);
  }

  if (validFrom && validTo && validTo < validFrom) {
    throw new AppError('Valid to date cannot be before valid from date', 400);
  }

  try {
    return await insertPricingRule({
      rule_type: ruleType,
      min_qty: minQty,
      active,
      valid_from: validFrom,
      valid_to: validTo,
    });
  } catch (error) {
    if (error.code === '23505') {
      throw new AppError('Rule type already exists', 409);
    }

    throw error;
  }
}

async function patchPricingRule(ruleId, input) {
  const normalizedRuleId = String(ruleId || '').trim();

  if (!normalizedRuleId) {
    throw new AppError('Rule id is required', 400);
  }

  if ('rule_type' in input) {
    throw new AppError('Rule type cannot be updated', 400);
  }

  const existingRule = await findPricingRuleById(normalizedRuleId);

  if (!existingRule) {
    throw new AppError('Rule not found', 404);
  }

  if (!('min_qty' in input) && !('active' in input) && !('valid_from' in input) && !('valid_to' in input)) {
    throw new AppError('No editable fields were provided for rule', 400);
  }

  const minQty =
    'min_qty' in input ? coerceMinQty(input.min_qty) : Number(existingRule.min_qty);
  const validFrom =
    'valid_from' in input ? normalizeDate(input.valid_from) : normalizeDate(existingRule.valid_from);
  const validTo =
    'valid_to' in input ? normalizeDate(input.valid_to) : normalizeDate(existingRule.valid_to);
  const active = 'active' in input ? input.active : existingRule.active;

  if (minQty === null) {
    throw new AppError('Minimum quantity is invalid', 400);
  }

  if ('valid_from' in input && input.valid_from && !validFrom) {
    throw new AppError('Valid from date is invalid', 400);
  }

  if ('valid_to' in input && input.valid_to && !validTo) {
    throw new AppError('Valid to date is invalid', 400);
  }

  if (validFrom && validTo && validTo < validFrom) {
    throw new AppError('Valid to date cannot be before valid from date', 400);
  }

  if (typeof active !== 'boolean') {
    throw new AppError('Rule active state is invalid', 400);
  }

  return updatePricingRule(normalizedRuleId, {
    min_qty: minQty,
    active,
    valid_from: validFrom,
    valid_to: validTo,
  });
}

module.exports = {
  listPricingRules,
  createPricingRule,
  patchPricingRule,
};