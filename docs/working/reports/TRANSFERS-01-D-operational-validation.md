# TRANSFERS-01-D — Validacion operativa entre sedes

Fecha: `2026-07-08`

## Objetivo

Validar el flujo real de transferencias entre sedes en entorno demo/controlado: solicitud, aprobacion, despacho, recepcion, stock final y kardex.

## Entorno y alcance

- Backend local usado: `http://localhost:3001`.
- Frontend local usado: `http://localhost:3000` ya estaba activo; el intento de levantar otro Next dev detecto un proceso existente.
- Base conectada por `apps/backend/.env`: Supabase remoto `aws-1-us-east-1.pooler.supabase.com/postgres`.
- No se cambio codigo de producto, permisos, migraciones ni configuracion.
- La prueba movio stock demo de forma real y rastreable con nota `TRANSFERS-01-D 2026-07-08T03:35:49.193Z`.

## Escenario probado

| Dato | Valor |
|---|---|
| Origen | `ALM-CENT` — Almacen Central |
| Destino | `TD-CENT` — Tienda Centro |
| Variante | `JOG-FTER-M-UNICO` |
| Cantidad | `1` |
| Solicitante / receptor | `tienda` (`VENDEDOR/A`, default `TD-CENT`) |
| Aprobador / despachador | `michifu` (`ADMIN`, default `ALM-CENT`) |

Transferencia principal:

```text
transfer_id: c5c8c77d-790f-4de2-9e05-65b22cf453ca
transfer_number: TR-1783481751269
estado final: received
```

## Evidencia funcional

Stock de `JOG-FTER-M-UNICO`:

| Momento | ALM-CENT | TD-CENT |
|---|---:|---:|
| Antes de crear | 22 | 0 |
| Despues de crear | 22 | 0 |
| Despues de aprobar | 22 | 0 |
| Despues de despachar | 21 | 0 |
| Despues de recepcionar | 21 | 1 |

Resultado:

- Crear y aprobar no modificaron `inventory`.
- Despachar desconto `1` unidad del origen.
- Recepcionar incremento `1` unidad en destino.
- El detalle final quedo en `received` sin accion primaria pendiente.

Kardex / `stock_movements` para la transferencia:

| Movimiento | Sede | Cantidad | Referencia |
|---|---|---:|---|
| `OUT` | `ALM-CENT` | 1 | `reference_type = transfer`, `reference_id = c5c8c77d-790f-4de2-9e05-65b22cf453ca` |
| `IN` | `TD-CENT` | 1 | `reference_type = transfer`, `reference_id = c5c8c77d-790f-4de2-9e05-65b22cf453ca` |

Rechazos controlados:

| Caso | Resultado |
|---|---|
| Destino intenta aprobar transferencia del origen | Rechazado `403 FORBIDDEN` |
| Origen intenta recepcionar transferencia destinada a otra sede | Rechazado `403 FORBIDDEN` |
| Despachar de nuevo una transferencia recibida | Rechazado `400`, `Only approved transfers can be shipped` |
| Recepcionar de nuevo una transferencia recibida | Rechazado `400`, `Only shipped transfers can be received` |

Cancelacion:

| Caso | Transferencia | Resultado | Stock |
|---|---|---|---|
| Cancelar en `requested` | `TR-1783481797847` | `cancelled` | Sin cambios |
| Cancelar en `approved` | `TR-1783481799676` | `cancelled` | Sin cambios |
| Cancelar transferencia `received` | `TR-1783481751269` | Rechazado `400`, `Only requested or approved transfers can be cancelled` | Sin cambios |

## Evidencia visual

Se valido por navegador automatizado a `1366x768`:

- Login con `tienda`.
- Redireccion a `/inicio`.
- Apertura de `/transferencias/c5c8c77d-790f-4de2-9e05-65b22cf453ca`.
- La pantalla mostro `TR-1783481751269`, estado `Recibida`, origen/destino, nota de validacion, linea `JOG-FTER-M-UNICO` y cantidades `1 / 1 / 1`.

Captura:

```text
docs/working/reports/TRANSFERS-01-D-transfer-detail.png
```

Observacion visual menor: durante la sesion Playwright aparecio un `401 Unauthorized` en consola, consistente con una consulta de autenticacion antes de completar login. No bloqueo la navegacion ni la carga del detalle.

## Verificacion tecnica ejecutada

```text
cd apps/backend; node --test src/__tests__/transfers.service.test.js
```

Resultado: `17` tests pasan, `0` fallan.

```text
npm exec --workspace @ripnel/frontend tsc -- --noEmit
```

Resultado: OK.

```text
npm run lint --workspace @ripnel/frontend
```

Resultado: OK, `0` errores y `43` warnings preexistentes.

```text
npm run test --workspace @ripnel/backend
```

Resultado: `145` pasan, `1` falla. La falla es ajena a transferencias:

```text
src/__tests__/styles.service.test.js
patchStyle rejects technical and identity fields
actual:   No editable fields were provided for style
expected: Style identity fields cannot be updated
```

Seguimiento `2026-07-08`: la falla de `patchStyle` fue corregida. Nueva ejecucion de `npm run test --workspace @ripnel/backend`: `146` tests pasan, `0` fallan.

## Consideraciones

- La validacion confirma que el contrato actual de transferencias esta coherente para el caso completo entre `ALM-CENT` y `TD-CENT`.
- La prueba dejo datos demo persistidos: una transferencia recibida y dos transferencias canceladas. Todas son rastreables por notas `TRANSFERS-01-D`.
- No se valido despacho parcial, rechazo con motivo ni edicion de lineas porque no forman parte del contrato actual aprobado.
- Para repetir la prueba sin cambiar stock real, conviene correrla solo en una base demo o resetear la variante usada con scripts de seed/control.
