-- ============================================================
-- Validate cash closing totals against confirmed sales
-- Default location: TD-CENT
-- Default business date: current Lima date
-- Replace target values if needed.
-- ============================================================

with target as (
  select
    'TD-CENT'::text as location_code,
    timezone('America/Lima', current_timestamp)::date as business_date_lima
)

select
  l.code as location_code,
  cc.business_date,
  cc.status,
  cc.total_cash,
  cc.total_yape,
  cc.total_plin,
  cc.total_transfer,
  cc.total_all,
  cc.closed_at
from cash_closings cc
inner join locations l on l.location_id = cc.location_id
inner join target t
  on t.location_code = l.code
 and t.business_date_lima = cc.business_date;

with target as (
  select
    'TD-CENT'::text as location_code,
    timezone('America/Lima', current_timestamp)::date as business_date_lima
)
select
  l.code as location_code,
  timezone('America/Lima', s.confirmed_at)::date as business_date_lima,
  count(distinct s.sale_id) as sale_count,
  coalesce(sum(case when sp.method = 'cash' then sp.amount else 0 end), 0)::numeric(12,2) as total_cash,
  coalesce(sum(case when sp.method = 'yape' then sp.amount else 0 end), 0)::numeric(12,2) as total_yape,
  coalesce(sum(case when sp.method = 'plin' then sp.amount else 0 end), 0)::numeric(12,2) as total_plin,
  coalesce(sum(case when sp.method = 'transfer' then sp.amount else 0 end), 0)::numeric(12,2) as total_transfer,
  coalesce(sum(sp.amount), 0)::numeric(12,2) as payment_total
from sales s
inner join sales_payments sp on sp.sale_id = s.sale_id
inner join locations l on l.location_id = s.location_id
inner join target t
  on t.location_code = l.code
 and t.business_date_lima = timezone('America/Lima', s.confirmed_at)::date
where s.status = 'confirmed'
group by l.code, timezone('America/Lima', s.confirmed_at)::date;

with target as (
  select
    'TD-CENT'::text as location_code,
    timezone('America/Lima', current_timestamp)::date as business_date_lima
),
sales_totals as (
  select
    s.location_id,
    timezone('America/Lima', s.confirmed_at)::date as business_date_lima,
    count(*) as sale_count,
    coalesce(sum(s.total_amount), 0)::numeric(12,2) as sales_total
  from sales s
  where s.status = 'confirmed'
  group by s.location_id, timezone('America/Lima', s.confirmed_at)::date
),
payment_totals as (
  select
    s.location_id,
    timezone('America/Lima', s.confirmed_at)::date as business_date_lima,
    coalesce(sum(sp.amount), 0)::numeric(12,2) as payment_total
  from sales s
  inner join sales_payments sp on sp.sale_id = s.sale_id
  where s.status = 'confirmed'
  group by s.location_id, timezone('America/Lima', s.confirmed_at)::date
)
select
  l.code as location_code,
  t.business_date_lima,
  coalesce(st.sale_count, 0) as sale_count,
  coalesce(st.sales_total, 0)::numeric(12,2) as sales_total,
  coalesce(pt.payment_total, 0)::numeric(12,2) as payment_total,
  (coalesce(st.sales_total, 0) - coalesce(pt.payment_total, 0))::numeric(12,2) as difference
from target t
inner join locations l on l.code = t.location_code
left join sales_totals st
  on st.location_id = l.location_id
 and st.business_date_lima = t.business_date_lima
left join payment_totals pt
  on pt.location_id = l.location_id
 and pt.business_date_lima = t.business_date_lima;
