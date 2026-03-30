const { query } = require('../../shared/db');

async function findAllCustomers({ documentType, sort }) {
  const params = [];
  const conditions = [];

  if (documentType && documentType !== 'all') {
    params.push(documentType);
    conditions.push(`c.document_type = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const order = sort === 'asc' ? 'ASC' : 'DESC';

  const result = await query(
    `SELECT
       c.customer_id,
       c.internal_code,
       c.document_type,
       c.document_number,
       c.full_name,
       c.business_name,
       c.commercial_name,
       c.email,
       c.phone,
       c.customer_type,
       c.active,
       c.notes,
       c.created_at,
       c.updated_at
     FROM customers c
     ${where}
     ORDER BY c.created_at ${order}`,
    params
  );

  return result.rows;
}

async function findCustomerById(customerId) {
  const result = await query(
    `SELECT
       customer_id, internal_code, document_type, document_number,
       full_name, business_name, commercial_name, email, phone,
       customer_type, active, notes, created_at, updated_at
     FROM customers
     WHERE customer_id = $1`,
    [customerId]
  );

  return result.rows[0] || null;
}

async function updateCustomer({ customerId, full_name, business_name, commercial_name, email, phone, customer_type, active, notes }) {
  const result = await query(
    `UPDATE customers
     SET
       full_name = $2,
       business_name = $3,
       commercial_name = $4,
       email = $5,
       phone = $6,
       customer_type = $7,
       active = $8,
       notes = $9,
       updated_at = CURRENT_TIMESTAMP
     WHERE customer_id = $1
     RETURNING
       customer_id, internal_code, document_type, document_number,
       full_name, business_name, commercial_name, email, phone,
       customer_type, active, notes, created_at, updated_at`,
    [customerId, full_name, business_name, commercial_name, email, phone, customer_type, active, notes]
  );

  return result.rows[0] || null;
}

module.exports = {
  findAllCustomers,
  findCustomerById,
  updateCustomer,
};
