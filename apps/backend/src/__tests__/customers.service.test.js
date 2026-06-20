const { afterEach, beforeEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");

const customersRepo = require("../modules/customers/customers.repo");

const SERVICE_PATH = require.resolve("../modules/customers/customers.service");

const originalCustomersRepo = {
  findAllCustomers: customersRepo.findAllCustomers,
  findCustomerById: customersRepo.findCustomerById,
  createCustomer: customersRepo.createCustomer,
  updateCustomer: customersRepo.updateCustomer,
  deleteCustomerById: customersRepo.deleteCustomerById,
};

function buildCustomer(overrides = {}) {
  return {
    customer_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    internal_code: null,
    document_type: "dni",
    document_number: "12345678",
    full_name: "Cliente Prueba",
    business_name: null,
    commercial_name: null,
    email: null,
    phone: null,
    address: null,
    customer_type: "retail",
    active: true,
    notes: null,
    ...overrides,
  };
}

function restoreStubs() {
  customersRepo.findAllCustomers = originalCustomersRepo.findAllCustomers;
  customersRepo.findCustomerById = originalCustomersRepo.findCustomerById;
  customersRepo.createCustomer = originalCustomersRepo.createCustomer;
  customersRepo.updateCustomer = originalCustomersRepo.updateCustomer;
  customersRepo.deleteCustomerById = originalCustomersRepo.deleteCustomerById;
  delete require.cache[SERVICE_PATH];
}

function loadCustomersService(overrides = {}) {
  customersRepo.findAllCustomers = overrides.findAllCustomers || (async () => []);
  customersRepo.findCustomerById = overrides.findCustomerById || (async () => null);
  customersRepo.createCustomer =
    overrides.createCustomer || (async (payload) => buildCustomer(payload));
  customersRepo.updateCustomer =
    overrides.updateCustomer || (async (payload) => buildCustomer(payload));
  customersRepo.deleteCustomerById = overrides.deleteCustomerById || (async () => null);

  delete require.cache[SERVICE_PATH];
  return require(SERVICE_PATH);
}

describe("customers service document validation", () => {
  beforeEach(() => {
    restoreStubs();
  });

  afterEach(() => {
    restoreStubs();
  });

  for (const customer of [
    { document_type: "dni", document_number: "12345678", full_name: "Cliente DNI" },
    { document_type: "ruc", document_number: "20123456789", business_name: "Empresa SAC" },
    { document_type: "ce", document_number: "ABC123456", full_name: "Cliente CE" },
    { document_type: "passport", document_number: "ab123456", full_name: "Cliente Passport" },
    { document_type: "none", document_number: null, full_name: "Cliente Sin Doc" },
  ]) {
    it(`creates customer with ${customer.document_type} document`, async () => {
      let capturedPayload = null;
      const service = loadCustomersService({
        createCustomer: async (payload) => {
          capturedPayload = payload;
          return buildCustomer(payload);
        },
      });

      const created = await service.createNewCustomer({
        ...customer,
        customer_type: "retail",
      });

      assert.equal(created.document_type, customer.document_type);
      assert.equal(capturedPayload.document_type, customer.document_type);
      if (customer.document_type === "passport") {
        assert.equal(capturedPayload.document_number, "AB123456");
      }
    });
  }

  it("rejects invalid document format", async () => {
    const service = loadCustomersService();

    await assert.rejects(
      () =>
        service.createNewCustomer({
          document_type: "dni",
          document_number: "123",
          full_name: "Cliente Invalido",
        }),
      /Invalid DNI format/
    );
  });

  it("rejects duplicate customer document", async () => {
    const service = loadCustomersService({
      createCustomer: async () => {
        const error = new Error("duplicate key value violates unique constraint");
        error.code = "23505";
        error.constraint = "uq_customers_document";
        throw error;
      },
    });

    await assert.rejects(
      () =>
        service.createNewCustomer({
          document_type: "dni",
          document_number: "12345678",
          full_name: "Cliente Duplicado",
        }),
      /Document already exists/
    );
  });
});
