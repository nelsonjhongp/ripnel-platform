const express = require('express');
const { requireAuth } = require('../../middlewares/auth');
const {
  getPricingRules,
  postPricingRule,
  patchPricingRuleById,
} = require('./pricing-rules.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/', getPricingRules);
router.post('/', postPricingRule);
router.patch('/:ruleId', patchPricingRuleById);

module.exports = router;