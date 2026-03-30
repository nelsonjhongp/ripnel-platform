const { AppError } = require('../../shared/errors');
const { findAllCustomers, findCustomerById, updateCustomer } = require('./customers.repo');

const ALLOWED_DOCUMENT_TYPES = ['none', 'dni', 'ruc', 'ce', 'passport'];
const ALLOWED_CUSTOMER_TYPES = ['retail', 'wholesale'];

async function listCustomers({ documentType, sort }) {
  const docType = documentType && documentType !== 'all' ? documentType : null;

  if (docType && !ALLOWED_DOCUMENT_TYPES.includes(docType)) {
    throw new AppError('Invalid document_type filter', 400);
  }

  const sortOrder = sort === 'asc' ? 'asc' : 'desc';

  return findAllCustomers({ documentType: docType, sort: sortOrder });
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

  const EDITABLE = ['full_name', 'business_name', 'commercial_name', 'email', 'phone', 'customer_type', 'active', 'notes'];
  const hasEditable = EDITABLE.some((f) => f in input);

  if (!hasEditable) {
    throw new AppError('No editable fields provided', 400);
  }

  const full_name = 'full_name' in input ? (input.full_name?.trim() || null) : existing.full_name;
  const business_name = 'business_name' in input ? (input.business_name?.trim() || null) : existing.business_name;
  const commercial_name = 'commercial_name' in input ? (input.commercial_name?.trim() || null) : existing.commercial_name;
  const email = 'email' in input ? (input.email?.trim() || null) : existing.email;
  const phone = 'phone' in input ? (input.phone?.trim() || null) : existing.phone;
  const notes = 'notes' in input ? (input.notes?.trim() || null) : existing.notes;
  const active = 'active' in input ? Boolean(input.active) : existing.active;

  let customer_type = existing.customer_type;
  if ('customer_type' in input) {
    if (!ALLOWED_CUSTOMER_TYPES.includes(input.customer_type)) {
      throw new AppError('Invalid customer_type value', 400);
    }
    customer_type = input.customer_type;
  }

  return updateCustomer({ customerId: normalizedId, full_name, business_name, commercial_name, email, phone, customer_type, active, notes });
}

module.exports = { listCustomers, patchCustomer };
