const express = require('express');
const { getCustomers, patchCustomerById } = require('./customers.controller');

const router = express.Router();

router.get('/', getCustomers);
router.patch('/:customerId', patchCustomerById);

module.exports = router;
