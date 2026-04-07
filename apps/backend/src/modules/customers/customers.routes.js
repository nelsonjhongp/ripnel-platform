const express = require('express');
const {
  requireAuth,
  requireAnyPermission,
} = require('../../middlewares/auth');
const { getCustomers, createCustomer, patchCustomerById, deleteCustomer } = require('./customers.controller');

const router = express.Router();

router.get('/', requireAuth, requireAnyPermission(['customers.manage', 'sales.pos']), getCustomers);
router.post('/', createCustomer);
router.patch('/:customerId', patchCustomerById);
router.delete('/:customerId', deleteCustomer);

module.exports = router;
