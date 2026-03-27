const express = require('express');
const {
  getPricingRules,
  postPricingRule,
  patchPricingRuleById,
} = require('./pricing-rules.controller');

const router = express.Router();

router.get('/', getPricingRules);
router.post('/', postPricingRule);
router.patch('/:ruleId', patchPricingRuleById);

module.exports = router;