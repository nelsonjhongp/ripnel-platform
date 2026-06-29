# Cash Module - Functional Specification

Especificacion funcional del modulo de caja. Resume flujos, reglas de negocio, diferencias que comunica la UI y el alcance actual de esta etapa.

---

## 1. Roles y permisos

| Permiso | Quien lo tiene | Que permite |
|---|---|---|
| `cash.view` | CAJA, TIENDA, VENTAS, ADMIN | Ver caja del dia, historial y detalle |
| `cash.operate` | CAJA, ADMIN | Abrir y cerrar caja |
| `cash.admin.view` | ADMIN | Ver control multi-sede, graficos y alertas |
| `cash.admin.reopen` | ADMIN | Reabrir cajas cerradas |

Reglas activas:

- `admin.manage` concede permisos de caja por resolucion de capacidades.
- Un usuario sin sede default no puede operar caja.
- Un usuario con solo `cash.view` entra en modo consulta, sin acciones de apertura o cierre.

---

## 2. Estados y transiciones

| Estado | Como se llega | Salida |
|---|---|---|
| `missing` | No existe sesion para la sede y fecha operativa | `POST /api/cash/open` |
| `open` | Caja abierta para sede + fecha operativa | `PATCH /api/cash/:id/close` |
| `closed` | Caja cerrada | `PATCH /api/cash/:id/reopen` |

Transiciones:

- Abrir: idempotente si ya existe una sesion `open`.
- Cerrar: solo sobre sesiones `open`.
- Reabrir: solo sobre sesiones `closed` y con motivo obligatorio.

---

## 3. Flujo operativo actual

### 3.1 Caja del dia

La pantalla `/caja` mantiene el patron operativo actual:

- `PosHeader` con sede y fecha operativa.
- `OpsActionBanner` con estado de caja.
- Metricas de ventas, consistencia y metodos de pago.
- Dialogo de apertura.
- Dialogo de cierre.

Reglas de comunicacion:

- La metrica `Total del dia` representa ventas confirmadas.
- El bloque `Total pagos` representa pagos registrados por metodo.
- Si `ventas != pagos`, la pagina muestra `Consistencia: Revisar`.
- El dialogo de cierre usa como total principal visible `total pagos a cerrar`, no el total de ventas.
- Si `ventas != pagos`, el dialogo advierte la diferencia, pero en esta etapa no bloquea el cierre.

### 3.2 Historial

La pantalla `/caja/historial` muestra sesiones paginadas por sede operativa:

- filtros por estado y rango de fechas;
- fechas iniciales basadas en `America/Lima`;
- sesion abierta comunicada como `Pendiente de cierre`;
- acceso al detalle por sesion.

### 3.3 Detalle

La pantalla `/caja/historial/[id]` separa dos lecturas:

- consistencia del sistema: `ventas vs pagos`;
- arqueo fisico: `efectivo declarado vs total pagos`.

Si existe `closing_balance_declared`, el detalle muestra la diferencia de arqueo sin mezclarla con la consistencia transaccional.

### 3.4 Control admin

La pantalla `/caja/control` resume sesiones multi-sede, alertas y graficos.

Reglas de estado:

- sesion `open` => estado neutro `Pendiente de cierre`;
- sesion `closed` + `is_consistent === true` => `Consistencia OK`;
- sesion `closed` + `is_consistent === false` => diferencia visible;
- sesion `closed` sin evaluacion consistente => estado neutro `Sin evaluacion`.

---

## 4. Diferencias que comunica el modulo

El modulo maneja dos diferencias distintas.

| Diferencia | Fuente | Significado |
|---|---|---|
| `ventas - pagos` | `sales_summary.consistency.difference` | Mide consistencia del sistema entre ventas confirmadas y pagos registrados |
| `efectivo declarado - total pagos` | `closing_balance_declared - total_all` | Mide arqueo fisico contra el total de pagos consolidados |

Reglas cerradas para esta etapa:

- El cierre consolida con `total_all`, es decir, con pagos registrados por metodo.
- `closing_balance_declared` sigue siendo opcional.
- Si `closing_balance_declared > total_all`, la UI comunica `Sobrante`.
- Si `closing_balance_declared < total_all`, la UI comunica `Faltante`.
- La inconsistencia `ventas vs pagos` se advierte, pero no bloquea el cierre en esta etapa.

---

## 5. Reglas de negocio

| Regla | Implementacion |
|---|---|
| Una caja por sede por fecha | `UNIQUE(location_id, business_date)` + validacion en servicio |
| Solo ventas confirmadas cuentan | Queries de consistencia y totales usan `status = 'confirmed'` |
| Reversals restan del total | `sales_payment_reversals` entra con signo negativo |
| No cerrar con ventas sin confirmar | `countUnconfirmedSalesByLocationAndDate()` bloquea el cierre |
| Fecha operativa | Todas las consultas usan `America/Lima` |
| Apertura idempotente | Si ya existe `open`, se retorna la sesion |
| Reapertura con motivo | `reopen_notes` obligatorio en backend |
| Admin multi-sede | Reapertura y control no quedan limitados a la sede default |

---

## 6. Alcance de esta etapa

Incluye:

- correcciones de semantica y claridad del cierre;
- alineacion entre UI y backend sobre el total visible de cierre;
- estado admin mas preciso para sesiones abiertas o no evaluadas;
- normalizacion de historial con fecha operativa Lima;
- actualizacion documental y cobertura minima de pruebas.

No incluye:

- rediseño visual amplio;
- cambios de layout o densidad;
- nuevas rutas o nuevas tablas;
- Fase 3 de trazabilidad completa.

---

## 7. Documentos relacionados

| Documento | Proposito |
|---|---|
| `docs/cash-improvement-plan.md` | Plan incremental de mejora |
| `docs/cash-closing-base.md` | Base tecnica y reglas de calculo |
| `docs/frontend-ui-ux-operativo.md` | Criterios operativos de UI |
| `docs/frontend-page-standard.md` | Patron estructural de paginas frontend |
