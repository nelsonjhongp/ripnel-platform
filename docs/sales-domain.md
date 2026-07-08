# Sales — Documentación de dominio

## Propósito

El módulo `sales` gestiona el ciclo completo de una venta: desde la creación (POS), consulta de historial y detalle, hasta la generación de comprobantes PDF (proforma y recibo) y envío por correo.

## Endpoints

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| `GET` | `/api/sales/context` | `sales.pos` | Contexto inicial del POS: usuario, sede default, estado de caja |
| `GET` | `/api/sales/sellable-variants` | `sales.pos` | Búsqueda de variantes vendibles (con stock y precio) para el selector de producto |
| `GET` | `/api/sales` | `sales.pos` | Historial de ventas con filtros (estado, cliente, documento, fecha, caja) |
| `GET` | `/api/sales/analytics/customers` | `sales.pos` | Analítica de clientes para el dashboard de BI |
| `GET` | `/api/sales/:saleId` | `sales.pos` | Detalle completo de una venta (header + líneas + pagos) |
| `POST` | `/api/sales` | `sales.pos` | Crear una venta nueva |
| `GET` | `/api/sales/:saleId/proforma-pdf` | `sales.pos` | PDF de proforma |
| `GET` | `/api/sales/:saleId/pdf` | `sales.pos` | PDF de recibo/comprobante |
| `POST` | `/api/sales/:saleId/send-email` | `sales.pos` | Enviar comprobante por correo al cliente |

## Flujo principal: creación de venta (`POST /api/sales`)

```
1. Autenticación y sede
   → Obtener usuario activo
   → Resolver sede default del usuario (debe existir y estar activa)

2. Validación de caja
   → Verificar caja abierta para la sede en la fecha operativa (hora Perú)
   → Si la caja está cerrada o no existe → 409 (CASH_OPEN_REQUIRED / CASH_ALREADY_CLOSED_FOR_DATE)

3. Cliente
   → Si se envía customer_id: validar que existe y está activo
   → Si no: asignar "cliente mostrador" genérico (SALE-CLI-001)

4. Validación cliente vs documento
   → Boleta: requiere cliente con DNI o CE, nombre y número de documento
   → Factura: requiere cliente con RUC, nombre, número de documento y dirección
   → Proforma / none: sin restricciones de documento

5. Líneas de venta
   → Validar cada variant_id existe
   → Obtener precio: retail o wholesale según tipo de cliente y regla mayorista activa
   → Validar stock suficiente (con tolerancia para proforma)
   → Aceptar price_override por línea (con razón obligatoria)
   → Calcular subtotales por línea

6. Descuento global
   → Modo amount: monto fijo, no puede exceder el subtotal
   → Modo percent: porcentaje, no puede exceder 100%
   → Se distribuye proporcionalmente entre todas las líneas

7. Impuestos
   → Boleta/Factura: IGV 18%
   → Proforma/None: sin impuesto
   → El IGV se distribuye línea por línea

8. Pagos
   → Pago único (campo payment_method): se crea un solo pago por el total
   → Pagos múltiples (array payments): la suma debe coincidir con el total (±0.01)
   → Métodos: cash, yape, plin, transfer

9. Transacción
   → INSERT en sales, sale_details, sale_payments
   → Decrementar inventario (stock en location)
   → INSERT en stock_movements (tipo SALE)
   → COMMIT atómico
```

## Tipos de documento

| Tipo | IGV | Requisitos de cliente |
|---|---|---|
| `none` | 0% | Ninguno (cliente mostrador por defecto) |
| `proforma` | 0% | Ninguno |
| `boleta` | 18% | DNI o CE con número |
| `factura` | 18% | RUC con número y dirección |

## Tipos de pago

`cash`, `yape`, `plin`, `transfer`

## Reglas de negocio clave

- **Caja requerida:** no se puede crear venta sin caja abierta en la sede para el día operativo
- **Stock:** la venta confirmada descuenta stock inmediatamente. Proformas permiten vender con stock 0 (no descuentan)
- **Precios:** el precio se determina por tipo de cliente (retail/wholesale). Si existe regla mayorista activa con cantidad mínima y el cliente es wholesale, aplica precio wholesale
- **Override de precio:** solo con razón documentada; el precio final debe ser ≥ 0
- **Cliente mostrador:** es el fallback cuando no se selecciona cliente. Debe existir en DB con internal_code `SALE-CLI-001`
- **Numeración:** el backend genera el número de venta secuencial por sede
- **Auditoría:** cada venta se registra en `audit_logs` vía triggers; el actor se configura con `SET LOCAL app.actor_user_id`

## Estados

Las ventas se crean como `confirmed`. No hay estado `draft` en ventas — el borrador se maneja en frontend.

## Integración con otros módulos

| Módulo | Relación |
|---|---|
| `auth` | Validación de usuario activo |
| `users` | Sede default del usuario |
| `cash` | Validación de caja abierta (lectura de `cash_closings`) |
| `customers` | Resolución y validación de cliente |
| `inventory` | Decremento de stock y registro de movimiento |
| `prices` | Consulta de precio retail/wholesale y regla mayorista |

## Archivos

```
apps/backend/src/modules/sales/
  sales.routes.js          Rutas y guards
  sales.controller.js      Handlers HTTP
  sales.service.js         Reglas de negocio (969 líneas)
  sales.repo.js            Queries SQL
  sales-receipt-pdf.js     Generación de PDF de recibo
  sales-proforma-pdf.js    Generación de PDF de proforma
```
