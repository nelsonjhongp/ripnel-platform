# TRANSFERS-01-A — Integridad de aprobacion y cancelacion

Fecha: `2026-07-07`

## Objetivo

Cerrar la primera fase del hardening de transferencias entre sedes sin redisenar el modulo: proteger `approve` y `cancel` contra carreras de estado, y revalidar stock antes de aprobar.

## Alcance implementado

- Backend de transferencias:
  - `apps/backend/src/modules/transfers/transfers.service.js`
  - `apps/backend/src/modules/transfers/transfers.repo.js`
- Pruebas unitarias de servicio:
  - `apps/backend/src/__tests__/transfers.service.test.js`

## No tocado

- Estados nuevos como `rejected`.
- Despacho parcial.
- Edicion de lineas con `PATCH`.
- UX/listado/detalle de transferencias.
- Migraciones o permisos de roles.

## Invariantes

- Crear y aprobar no descuentan stock ni generan kardex.
- Despachar descuenta origen y registra `OUT`.
- Recibir incrementa destino y registra `IN`.
- La autorizacion por sede sigue en backend aunque la UI oculte acciones.
- `400` se usa para estados invalidos ya observados bajo lock.
- `409 TRANSFER_STATUS_CHANGED` se usa cuando la fila cambia antes del update condicional.

## Resultado

- `approve` ahora:
  - abre transaccion;
  - lee cabecera con `FOR UPDATE`;
  - valida acceso, estado y permiso sobre la fila bloqueada;
  - carga lineas dentro de la transaccion;
  - revalida stock disponible del origen;
  - marca aprobado solo si el estado sigue en `requested`.
- `cancel` ahora:
  - abre transaccion;
  - lee cabecera con `FOR UPDATE`;
  - valida acceso, estado y permiso sobre la fila bloqueada;
  - marca cancelado solo si el estado sigue en `requested` o `approved`.
- Se agregaron helpers condicionales:
  - `markTransferApprovedIfRequested`
  - `markTransferCancelledIfOpen`

## Validacion ejecutada

```text
npm run test --workspace @ripnel/backend
```

Resultado: `146` tests pasan, `0` fallan.

## Pruebas agregadas

- Aprobacion revalida stock y confirma update condicional.
- Aprobacion falla con `TRANSFER_APPROVAL_STOCK_CHANGED` si el stock ya no alcanza.
- Aprobacion revierte con `TRANSFER_STATUS_CHANGED` si el update condicional no encuentra estado `requested`.
- Cancelacion confirma update condicional para transferencias abiertas.
- Cancelacion revierte con `TRANSFER_STATUS_CHANGED` si el estado cambio antes del update.

## Seguimiento recomendado

### Siguiente fase local recomendada

`TRANSFERS-01-B`: decision de producto y contrato.

- Confirmar si `ALMACEN` debe crear/ver solicitudes o solo ejecutar aprobacion/despacho/recepcion.
- Decidir si `cancelled` alcanza o se necesita `rejected` con motivo.
- Decidir si edicion de cantidades en `requested` es requisito MVP.
- Decidir si despacho parcial es requisito operativo o posterior.

### Trabajo apto para delegar en paralelo

- Explorador solo lectura: matriz final de roles/permisos post migraciones, con foco en `ALMACEN`, `VENDEDOR/A`, `ADMIN`.
- Explorador UX: revisar `open_for_store`, accion primaria y mensajes visibles en lista/detalle.
- Worker pequeno: ajuste UX de accion primaria en `open_for_store`, solo si se aprueba Fase C.
- Worker backend separado: endpoint `reject` con motivo, solo si se aprueba el cambio de estado y migracion.

### Trabajo que conviene mantener centralizado

- Migraciones de estado (`rejected`) y cambios de contrato API.
- Despacho parcial, porque toca servicio, repositorio, UI, copy y pruebas de stock.
- Cualquier cambio de permisos de roles, porque debe coordinar migracion, sidebar/guards y pruebas por rol.
