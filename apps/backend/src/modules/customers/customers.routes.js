const express = require('express');
const { getCustomers, createCustomer, patchCustomerById, deleteCustomer } = require('./customers.controller');

const router = express.Router();

router.get('/', getCustomers);
router.post('/', createCustomer);
router.patch('/:customerId', patchCustomerById);
router.delete('/:customerId', deleteCustomer);

module.exports = router;
