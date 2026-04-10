-- ============================================================
-- Validate history and sale detail against persisted data
-- Replace the sample sale number before running the detail queries.
-- Suggested demo values: N-900001, B-900001, F-900001
-- ============================================================

-- 1) Recent sales visible for the operating location
select
  s.sale_id,
  s.sale_number,
  s.status,
  s.document_type,
  s.customer_name_text,
  l.name as location_name,
  u.full_name as seller_name,
  s.subtotal_amount,
  s.tax_amount,
  s.total_amount,
  timezone('America/Lima', coalesce(s.confirmed_at, s.created_at)) as operated_at_lima
from sales s
inner join locations l on l.location_id = s.location_id
inner join users u on u.user_id = s.seller_user_id
where l.code = 'TD-CENT'
order by coalesce(s.confirmed_at, s.created_at) desc
limit 20;

-- 2) Sale header
select
  s.sale_id,
  s.sale_number,
  s.status,
  s.document_type,
  s.customer_name_text,
  s.customer_doc_type,
  s.customer_doc_number,
  s.customer_address_text,
  l.name as location_name,
  u.full_name as seller_name,
  s.subtotal_amount,
  s.tax_amount,
  s.total_amount,
  timezone('America/Lima', coalesce(s.confirmed_at, s.created_at)) as operated_at_lima
from sales s
inner join locations l on l.location_id = s.location_id
inner join users u on u.user_id = s.seller_user_id
where s.sale_number = 'N-900001';

-- 3) Sale lines
select
  sd.sale_detail_id,
  pv.sku,
  ps.name as style_name,
  sz.code as size_code,
  c.code as color_code,
  sd.quantity,
  sd.unit_price_list,
  sd.unit_price_final,
  sd.line_subtotal,
  sd.line_tax,
  sd.line_total
from sales_details sd
inner join sales s on s.sale_id = sd.sale_id
inner join product_variants pv on pv.variant_id = sd.variant_id
inner join product_styles ps on ps.style_id = pv.style_id
inner join sizes sz on sz.size_id = pv.size_id
inner join colors c on c.color_id = pv.color_id
where s.sale_number = 'N-900001'
order by sd.created_at asc;

-- 4) Payments
select
  sp.payment_id,
  sp.method,
  sp.amount,
  sp.reference,
  timezone('America/Lima', sp.paid_at) as paid_at_lima
from sales_payments sp
inner join sales s on s.sale_id = sp.sale_id
where s.sale_number = 'N-900001'
order by sp.paid_at asc;

-- 5) Consistency check
select
  s.sale_number,
  s.subtotal_amount as header_subtotal,
  s.tax_amount as header_tax,
  s.total_amount as header_total,
  coalesce(detail_totals.detail_subtotal, 0)::numeric(12,2) as detail_subtotal,
  coalesce(detail_totals.detail_tax, 0)::numeric(12,2) as detail_tax,
  coalesce(detail_totals.detail_total, 0)::numeric(12,2) as detail_total,
  coalesce(payment_totals.payment_total, 0)::numeric(12,2) as payment_total
from sales s
left join (
  select
    sale_id,
    sum(line_subtotal) as detail_subtotal,
    sum(line_tax) as detail_tax,
    sum(line_total) as detail_total
  from sales_details
  group by sale_id
) detail_totals on detail_totals.sale_id = s.sale_id
left join (
  select
    sale_id,
    sum(amount) as payment_total
  from sales_payments
  group by sale_id
) payment_totals on payment_totals.sale_id = s.sale_id
where s.sale_number = 'N-900001'
group by
  s.sale_number,
  s.subtotal_amount,
  s.tax_amount,
  s.total_amount,
  detail_totals.detail_subtotal,
  detail_totals.detail_tax,
  detail_totals.detail_total,
  payment_totals.payment_total;
