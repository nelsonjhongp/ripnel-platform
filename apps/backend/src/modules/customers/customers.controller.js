const { listCustomers, createNewCustomer, patchCustomer, removeCustomer } = require('./customers.service');

async function getCustomers(req, res, next) {
  try {
    const { document_type, sort, q } = req.query;
    const customers = await listCustomers({ documentType: document_type, sort, q });
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

async function createCustomer(req, res, next) {
  try {
    const customer = await createNewCustomer(req.body || {});
    res.status(201).json({ ok: true, data: customer });
  } catch (error) {
    next(error);
  }
}

async function deleteCustomer(req, res, next) {
  try {
    const result = await removeCustomer(req.params.customerId);
    res.json({ ok: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = { getCustomers, createCustomer, patchCustomerById, deleteCustomer };
