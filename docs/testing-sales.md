# Testing manual de Ventas MVP

Semana 9 del proyecto: `2026-04-06` a `2026-04-12` en `America/Lima`.

## Objetivo

Validar el flujo de "Nueva venta" de punta a punta con datos reales y sin depender de mocks.

## Prerrequisitos

Ejecutar o verificar estos datos antes de probar:

1. `database/seed_access_control.sql`
2. `database/seed_operational_demo.sql`
3. `database/seed_variants_inventory.sql`
4. `database/seed_style_size_prices.sql`
5. `database/seed_sales_mvp.sql`
6. `database/readiness_sales_mvp.sql`

## Readiness check

Antes de iniciar el testing, confirmar:

- existe usuario operativo con sede default;
- existe al menos una sede tienda activa;
- existen clientes de prueba retail y factura;
- existe cliente generico de mostrador con `customer_id` real;
- existen variantes con stock en la sede;
- existen precios vigentes para esas variantes;
- login y sesion funcionan;
- la pantalla de nueva venta carga sin mocks.

## Casos felices

### 1. Venta retail simple

- iniciar sesion con usuario de ventas;
- abrir nueva venta;
- confirmar que la sede visible es la sede default del usuario;
- seleccionar estilo y luego combinacion talla/color con stock;
- agregar cantidad valida;
- seleccionar cliente retail o cliente generico;
- elegir metodo de pago;
- confirmar venta.

Esperado:

- la venta queda registrada;
- se genera numero o identificador visible;
- el stock baja;
- aparece movimiento en kardex o trazabilidad equivalente.

## Casos borde

### 2. Sin stock suficiente

- intentar vender mas unidades de las disponibles.

Esperado:

- backend rechaza la operacion;
- la UI muestra error claro;
- no se inserta venta parcial;
- no cambia el stock.

### 3. Sin precio vigente

- intentar vender una variante sin precio aplicable.

Esperado:

- backend rechaza la operacion;
- la UI muestra error claro;
- no se registra la venta.

### 4. Venta fuera de sede permitida

- intentar consultar ventas de otra sede usando session activa.

Esperado:

- backend no devuelve ventas fuera de la sede default;
- el detalle de una venta ajena responde `404`.

### 5. Cliente invalido

- enviar cliente inexistente o datos inconsistentes.

Esperado:

- backend rechaza la operacion;
- no se registra la venta.

### 6. Pago invalido

- enviar metodo no permitido o monto insuficiente.

Esperado:

- backend rechaza la operacion;
- no se registra la venta;
- no cambia stock.

## Validaciones cruzadas en base de datos

Luego de una venta exitosa, revisar:

- `sales`
- `sales_details`
- `sales_payments`
- `stock_movements`
- `inventory`

## Nota minima que debe quedar en Jira al cerrar una tarea

Usar siempre una nota corta de prueba, por ejemplo:

- "Probado con cliente retail y pago yape. Venta registrada y stock descontado."
- "Probado caso sin stock. Backend rechazo request y no inserto filas."

## Criterio de cierre funcional

Ventas MVP se considera validado manualmente cuando:

- hay al menos una venta exitosa;
- hay al menos un caso de rechazo por stock;
- hay al menos un caso de rechazo por precio faltante;
- existe trazabilidad del movimiento de salida;
- el readiness check no deja bloqueos criticos abiertos.

## Casos fuera del compromiso semanal

- historial de ventas conectado;
- detalle de venta confirmado;
- reportes o exportaciones.
