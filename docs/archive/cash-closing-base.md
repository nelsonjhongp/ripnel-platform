# Base tecnica para Caja y Cierre Diario

## Objetivo

Dejar una base utilizable para que backend avance `caja y cierre diario` sin depender de mocks ni de decisiones abiertas sobre ventas.

## Fuente de verdad

- `sales`: cabecera de la venta confirmada
- `sales_payments`: metodo y monto efectivamente registrados
- `cash_closings`: snapshot diario por sede cuando se implemente apertura/cierre

Para esta fase, los totales de caja salen de `sales` + `sales_payments`. `cash_closings` todavia no se siembra.

## Reglas cerradas para esta fase

- Solo cuentan ventas con `status = 'confirmed'`.
- La fecha de negocio se deriva de `confirmed_at` en `America/Lima`.
- La unicidad esperada de caja sigue siendo `location_id + business_date`.
- Los totales se calculan por sede y fecha de negocio.
- Los montos se toman de `sales_payments`, no de valores hardcodeados en frontend.

## Que si entra en esta base

- dataset confiable con 3 ventas confirmadas de demo
- una venta `cash` hoy
- una venta `yape` hoy
- una venta `transfer` ayer
- queries de referencia para agregado diario

## Que no entra todavia

- reaperturas
- multiples cajas para la misma sede y fecha
- arqueo manual
- sobrantes o faltantes de efectivo
- conciliacion con vouchers externos
- UI final de caja

## Query de ventas confirmadas por sede y fecha

```sql
select
  l.code as location_code,
  timezone('America/Lima', s.confirmed_at)::date as business_date_lima,
  s.sale_number,
  s.document_type,
  s.total_amount
from sales s
inner join locations l on l.location_id = s.location_id
where s.status = 'confirmed'
  and l.code = 'TD-CENT'
order by business_date_lima desc, s.confirmed_at desc;
```

## Query de agregado por metodo de pago

```sql
select
  l.code as location_code,
  timezone('America/Lima', s.confirmed_at)::date as business_date_lima,
  coalesce(sum(case when sp.method = 'cash' then sp.amount else 0 end), 0)::numeric(12,2) as total_cash,
  coalesce(sum(case when sp.method = 'yape' then sp.amount else 0 end), 0)::numeric(12,2) as total_yape,
  coalesce(sum(case when sp.method = 'plin' then sp.amount else 0 end), 0)::numeric(12,2) as total_plin,
  coalesce(sum(case when sp.method = 'transfer' then sp.amount else 0 end), 0)::numeric(12,2) as total_transfer,
  coalesce(sum(sp.amount), 0)::numeric(12,2) as total_all
from sales s
inner join sales_payments sp on sp.sale_id = s.sale_id
inner join locations l on l.location_id = s.location_id
where s.status = 'confirmed'
  and l.code = 'TD-CENT'
group by l.code, timezone('America/Lima', s.confirmed_at)::date
order by business_date_lima desc;
```

## Query de consistencia entre cabecera y pagos

```sql
select
  s.sale_number,
  s.total_amount,
  coalesce(sum(sp.amount), 0)::numeric(12,2) as payment_total,
  (s.total_amount - coalesce(sum(sp.amount), 0))::numeric(12,2) as difference
from sales s
left join sales_payments sp on sp.sale_id = s.sale_id
where s.status = 'confirmed'
group by s.sale_number, s.total_amount
order by s.sale_number asc;
```

## Casos borde que backend de caja debe respetar

- una venta sin `confirmed_at` no debe entrar al cierre diario
- una venta `draft` o `cancelled` no debe sumar
- una venta confirmada con pagos inconsistentes debe detectarse con query de diferencia
- una venta de ayer no debe contaminar el cierre de hoy
- si no hay ventas en una fecha, los totales por metodo deben ser cero

## Dataset recomendado

Ejecutar en este orden:

1. `database/seed_access_control.sql`
2. `database/seed_operational_demo.sql`
3. `database/seed_variants_inventory.sql`
4. `database/seed_style_size_prices.sql`
5. `database/seed_sales_mvp.sql`
6. `database/seed_sales_confirmed_demo.sql`
7. `database/readiness_sales_mvp.sql`

El seed `database/seed_sales_confirmed_demo.sql` deja la base minima reutilizable para historial, detalle y caja.
