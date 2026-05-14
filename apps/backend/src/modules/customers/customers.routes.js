const express = require('express');
const {
  requireAuth,
  requireAnyPermission,
  requirePermission,
} = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validate');
const { createCustomer: createCustomerSchema, patchCustomer: patchCustomerSchema } = require('../../shared/schemas');
const { getCustomers, createCustomer, patchCustomerById, deleteCustomer } = require('./customers.controller');

const router = express.Router();

router.get('/', requireAuth, requireAnyPermission(['customers.manage', 'sales.pos']), getCustomers);
router.post('/', requireAuth, requireAnyPermission(['customers.manage', 'sales.pos']), validate(createCustomerSchema), createCustomer);
router.patch(
  '/:customerId',
  requireAuth,
  requireAnyPermission(['customers.manage', 'sales.pos']),
  validate(patchCustomerSchema),
  patchCustomerById
);
router.delete('/:customerId', requireAuth, requirePermission('customers.manage'), deleteCustomer);

module.exports = router;
