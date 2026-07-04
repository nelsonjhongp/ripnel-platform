begin;

-- ============================================================================
-- Phase 1: Create VENDEDOR/A role (store operator with full capabilities)
-- ============================================================================
insert into roles (name, description, active)
values (
  'VENDEDOR/A',
  'Operacion completa de tienda: ventas, caja, stock, transferencias, productos, precios y catalogos.',
  true
);

-- ============================================================================
-- Phase 2: Migrate users from old roles to VENDEDOR/A
-- ============================================================================
update users
set role_id = (select role_id from roles where name = 'VENDEDOR/A'),
    updated_at = current_timestamp
where role_id in (
  select role_id from roles where name in ('TIENDA', 'CAJA', 'VENTAS')
);

-- ============================================================================
-- Phase 3: Deactivate legacy roles (TIENDA, CAJA, VENTAS)
-- ============================================================================
update roles
set active = false,
    updated_at = current_timestamp
where name in ('TIENDA', 'CAJA', 'VENTAS');

-- ============================================================================
-- Phase 4: Clean up all role_permissions for the 5 base groups
-- ============================================================================
delete from role_permissions rp
using roles r
where rp.role_id = r.role_id
  and r.name in ('ADMIN', 'VENDEDOR/A', 'ALMACEN', 'TIENDA', 'CAJA', 'VENTAS');

-- ============================================================================
-- Phase 5: Assign permissions — VENDEDOR/A (19 permissions)
-- ============================================================================
insert into role_permissions (role_id, permission_id)
select r.role_id, p.permission_id
from roles r
cross join permissions p
where r.name = 'VENDEDOR/A'
  and p.key in (
    'sales.pos',
    'cash.view',
    'cash.operate',
    'inventory.view',
    'inventory.adjust',
    'transfers.request.create',
    'transfers.request.view_own',
    'transfers.approve',
    'transfers.ship',
    'transfers.receive',
    'transfers.cancel',
    'customers.manage',
    'products.manage',
    'prices.manage',
    'catalogs.manage',
    'sales.postsale.view',
    'sales.postsale.exchange',
    'sales.postsale.cancel',
    'dashboard.view'
  );

-- ============================================================================
-- Phase 6: Assign permissions — ALMACEN (7 permissions)
--           Remove transfers.manage umbrella, keep explicit sub-permissions
-- ============================================================================
insert into role_permissions (role_id, permission_id)
select r.role_id, p.permission_id
from roles r
cross join permissions p
where r.name = 'ALMACEN'
  and p.key in (
    'inventory.view',
    'inventory.adjust',
    'transfers.approve',
    'transfers.ship',
    'transfers.receive',
    'transfers.cancel',
    'dashboard.view'
  );

-- ============================================================================
-- Phase 7: Assign permissions — ADMIN (all 24 permissions)
-- ============================================================================
insert into role_permissions (role_id, permission_id)
select r.role_id, p.permission_id
from roles r
cross join permissions p
where r.name = 'ADMIN';

commit;
