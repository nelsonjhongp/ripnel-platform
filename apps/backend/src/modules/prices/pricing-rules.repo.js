const { query } = require('../../shared/db');

async function findAllPricingRules() {
  const result = await query(
    `select
       rule_id,
       rule_type,
       min_qty,
       active,
       valid_from,
       valid_to,
       created_at,
       updated_at
     from pricing_rules
     order by rule_type asc`
  );

  return result.rows;
}

async function findPricingRuleById(ruleId) {
  const result = await query(
    `select
       rule_id,
       rule_type,
       min_qty,
       active,
       valid_from,
       valid_to,
       created_at,
       updated_at
     from pricing_rules
     where rule_id = $1`,
    [ruleId]
  );

  return result.rows[0] || null;
}

async function insertPricingRule(payload) {
  const result = await query(
    `insert into pricing_rules (
       rule_type,
       min_qty,
       active,
       valid_from,
       valid_to
     )
     values ($1, $2, $3, $4, $5)
     returning
       rule_id,
       rule_type,
       min_qty,
       active,
       valid_from,
       valid_to,
       created_at,
       updated_at`,
    [
      payload.rule_type,
      payload.min_qty,
      payload.active,
      payload.valid_from,
      payload.valid_to,
    ]
  );

  return result.rows[0] || null;
}

async function updatePricingRule(ruleId, payload) {
  const columns = Object.keys(payload);
  const values = Object.values(payload);
  const assignments = columns.map((column, index) => `${column} = $${index + 2}`);

  assignments.push('updated_at = current_timestamp');

  const result = await query(
    `update pricing_rules
     set ${assignments.join(', ')}
     where rule_id = $1
     returning
       rule_id,
       rule_type,
       min_qty,
       active,
       valid_from,
       valid_to,
       created_at,
       updated_at`,
    [ruleId, ...values]
  );

  return result.rows[0] || null;
}

module.exports = {
  findAllPricingRules,
  findPricingRuleById,
  insertPricingRule,
  updatePricingRule,
};