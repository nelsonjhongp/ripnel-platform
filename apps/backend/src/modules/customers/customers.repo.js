const { query } = require('../../shared/db');

async function findAllCustomers({ documentType, sort, q }) {
  const params = [];
  const conditions = [];

  if (documentType && documentType !== 'all') {
    params.push(documentType);
    conditions.push(`c.document_type = $${params.length}`);
  }

  if (q) {
    params.push(`%${q}%`);
    const index = params.length;
    conditions.push(
      `(
        COALESCE(c.internal_code, '') ILIKE $${index}
        OR
        c.full_name ILIKE $${index}
        OR COALESCE(c.business_name, '') ILIKE $${index}
        OR COALESCE(c.commercial_name, '') ILIKE $${index}
        OR COALESCE(c.document_number, '') ILIKE $${index}
      )`
    );
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
       COALESCE(NULLIF(c.full_name, ''), NULLIF(c.business_name, ''), NULLIF(c.commercial_name, '')) AS display_name,
       c.email,
       c.phone,
       c.district,
       c.address,
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
       full_name, business_name, commercial_name,
       COALESCE(NULLIF(full_name, ''), NULLIF(business_name, ''), NULLIF(commercial_name, '')) AS display_name,
       email, phone, district, address,
       customer_type, active, notes, created_at, updated_at
     FROM customers
     WHERE customer_id = $1`,
    [customerId]
  );

  return result.rows[0] || null;
}

async function updateCustomer({ customerId, document_type, document_number, full_name, business_name, commercial_name, email, phone, customer_type, active, notes }) {
  const result = await query(
    `UPDATE customers
     SET
       document_type = $2,
       document_number = $3,
       full_name = $4,
       business_name = $5,
       commercial_name = $6,
       email = $7,
       phone = $8,
       customer_type = $9,
       active = $10,
       notes = $11,
       updated_at = CURRENT_TIMESTAMP
     WHERE customer_id = $1
     RETURNING
       customer_id, internal_code, document_type, document_number,
       full_name, business_name, commercial_name, email, phone,
       customer_type, active, notes, created_at, updated_at`,
    [customerId, document_type, document_number, full_name, business_name, commercial_name, email, phone, customer_type, active, notes]
  );

  return result.rows[0] || null;
}

async function createCustomer({ document_type, document_number, full_name, business_name, commercial_name, email, phone, customer_type, active, notes }) {
  const result = await query(
    `INSERT INTO customers (
       document_type,
       document_number,
       full_name,
       business_name,
       commercial_name,
       email,
       phone,
       customer_type,
       active,
       notes
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING
       customer_id, internal_code, document_type, document_number,
       full_name, business_name, commercial_name, email, phone,
       customer_type, active, notes, created_at, updated_at`,
    [document_type, document_number, full_name, business_name, commercial_name, email, phone, customer_type, active, notes]
  );

  return result.rows[0] || null;
}

async function deleteCustomerById(customerId) {
  const result = await query(
    `DELETE FROM customers
     WHERE customer_id = $1
     RETURNING customer_id`,
    [customerId]
  );

  return result.rows[0] || null;
}

module.exports = {
  findAllCustomers,
  findCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomerById,
};
