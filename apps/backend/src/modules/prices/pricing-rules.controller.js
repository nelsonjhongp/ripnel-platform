const {
  listPricingRules,
  createPricingRule,
  patchPricingRule,
} = require('./pricing-rules.service');

async function getPricingRules(req, res, next) {
  try {
    const rules = await listPricingRules();
    res.json({ ok: true, data: rules });
  } catch (error) {
    next(error);
  }
}

async function postPricingRule(req, res, next) {
  try {
    const rule = await createPricingRule(req.body);
    res.status(201).json({ ok: true, data: rule });
  } catch (error) {
    next(error);
  }
}

async function patchPricingRuleById(req, res, next) {
  try {
    const rule = await patchPricingRule(req.params.ruleId, req.body);
    res.json({ ok: true, data: rule });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPricingRules,
  postPricingRule,
  patchPricingRuleById,
};