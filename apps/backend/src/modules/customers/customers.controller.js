const { listCustomers, patchCustomer } = require('./customers.service');

async function getCustomers(req, res, next) {
  try {
    const { document_type, sort } = req.query;
    const customers = await listCustomers({ documentType: document_type, sort });
    res.json({ ok: true, data: customers });
  } catch (error) {
    next(error);
  }
}

async function patchCustomerById(req, res, next) {
  try {
    const customer = await patchCustomer(req.params.customerId, req.body);
    res.json({ ok: true, data: customer });
  } catch (error) {
    next(error);
  }
}

module.exports = { getCustomers, patchCustomerById };
