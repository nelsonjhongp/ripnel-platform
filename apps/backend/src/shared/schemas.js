const { z } = require('zod');

const login = z.object({
  username: z.string({ message: 'username is required' }).min(1, 'username is required'),
  password: z.string({ message: 'password is required' }).min(1, 'password is required'),
});

const changePassword = z.object({
  current_password: z.string({ message: 'current_password is required' }).min(1),
  new_password: z.string({ message: 'new_password is required' }).min(8, 'new_password must be at least 8 characters'),
});

const userAssignment = z.object({
  location_id: z.string().uuid('invalid location_id'),
  is_default: z.boolean().optional().default(false),
});

const userAssignments = z.array(userAssignment).min(1, 'At least one location assignment is required');

const createUser = z.object({
  full_name: z.string({ message: 'full_name is required' }).min(1, 'full_name is required'),
  username: z.string({ message: 'username is required' }).min(1, 'username is required'),
  email: z.string().email('invalid email').optional().nullable().default(null),
  role_id: z.string().uuid('invalid role_id'),
  active: z.boolean().optional().default(true),
  assignments: z
    .array(userAssignment)
    .min(1, 'At least one location assignment is required'),
});

const patchUser = z.object({
  full_name: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
  email: z.string().email('invalid email').optional().nullable(),
  role_id: z.string().uuid('invalid role_id').optional().nullable(),
  active: z.boolean().optional(),
});

const createCustomer = z.object({
  document_type: z.enum(['none', 'dni', 'ruc', 'ce', 'passport']).optional().default('none'),
  document_number: z.string().optional().nullable().default(null),
  full_name: z.string().optional().nullable().default(null),
  business_name: z.string().optional().nullable().default(null),
  commercial_name: z.string().optional().nullable().default(null),
  email: z.string().optional().nullable().default(null),
  phone: z.string().optional().nullable().default(null),
  address: z.string().optional().nullable().default(null),
  customer_type: z.enum(['retail', 'wholesale']).optional().default('retail'),
  active: z.boolean().optional().default(true),
  notes: z.string().optional().nullable().default(null),
});

const patchCustomer = z.object({
  document_type: z.enum(['none', 'dni', 'ruc', 'ce', 'passport']).optional(),
  document_number: z.string().optional().nullable(),
  full_name: z.string().optional().nullable(),
  business_name: z.string().optional().nullable(),
  commercial_name: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  customer_type: z.enum(['retail', 'wholesale']).optional(),
  active: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

const saleItem = z.object({
  variant_id: z.string().uuid('invalid variant_id'),
  quantity: z.number().int().positive('quantity must be a positive integer'),
  price_override: z
    .object({
      unit_price_final: z.number().nonnegative(),
      reason: z.string().min(1),
    })
    .optional()
    .nullable(),
});

const saleDiscount = z.object({
  mode: z.enum(['amount', 'percent']),
  value: z.number().positive(),
  reason: z.string().min(1),
});

const payment = z.object({
  method: z.enum(['cash', 'yape', 'plin', 'transfer']),
  amount: z.number().positive(),
  reference: z.string().optional().nullable().default(null),
});

const createSale = z.object({
  document_type: z.enum(['none', 'proforma', 'boleta', 'factura']).optional().default('none'),
  payment_method: z.enum(['cash', 'yape', 'plin', 'transfer']).optional().default('cash'),
  notes: z.string().optional().nullable().default(null),
  customer_id: z.string().uuid().optional().nullable().default(null),
  items: z.array(saleItem).min(1, 'At least one item is required'),
  payments: z.array(payment).optional().nullable(),
  sale_discount: saleDiscount.optional().nullable(),
});

// Postsales schemas
const createExchange = z.object({
  sale_detail_id: z.string().uuid(),
  replacement_variant_id: z.string().uuid(),
  quantity: z.number().int().positive().optional(),
  payment_method: z.enum(['cash', 'yape', 'plin', 'transfer']).optional(),
  payment_reference: z.string().max(80).optional().nullable().default(null),
  reason: z.string().min(1, 'El motivo es requerido'),
  notes: z.string().optional(),
});

const cancelSale = z.object({
  reason: z.string().min(1, 'El motivo es requerido'),
  notes: z.string().optional(),
});

// Cash schemas
const openCash = z.object({
  location_id: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const closeCash = z.object({
  notes: z.string().optional(),
});

const reopenCash = z.object({
  reopen_notes: z.string().min(1, 'El motivo de reapertura es requerido'),
});

module.exports = {
  login,
  changePassword,
  createUser,
  patchUser,
  userAssignments,
  createCustomer,
  patchCustomer,
  createSale,
  createExchange,
  cancelSale,
  openCash,
  closeCash,
  reopenCash,
};
