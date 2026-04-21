const express = require('express');
const {
  requireAuth,
  requireAnyPermission,
  requirePermission,
} = require('../../middlewares/auth');
const { getCustomers, createCustomer, patchCustomerById, deleteCustomer } = require('./customers.controller');

const router = express.Router();

router.get('/', requireAuth, requireAnyPermission(['customers.manage', 'sales.pos']), getCustomers);
router.post('/', requireAuth, requireAnyPermission(['customers.manage', 'sales.pos']), createCustomer);
router.patch(
  '/:customerId',
  requireAuth,
  requireAnyPermission(['customers.manage', 'sales.pos']),
  patchCustomerById
);
router.delete('/:customerId', requireAuth, requirePermission('customers.manage'), deleteCustomer);

module.exports = router;
