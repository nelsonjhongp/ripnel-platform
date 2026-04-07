-- ============================================================
-- RIPNEL confirmed sales demo seed
-- Purpose: leave 3 confirmed sales ready for history/detail
-- checks and as a stable base for cash closing calculations.
--
-- Recommended execution order:
-- 1) database/seed_access_control.sql
-- 2) database/seed_operational_demo.sql
-- 3) database/seed_variants_inventory.sql
-- 4) database/seed_style_size_prices.sql
-- 5) database/seed_sales_mvp.sql
-- 6) this file
--
-- Safe to re-run:
-- - restores stock previously consumed by this seed
-- - removes only demo sales with sale_number N-900001, B-900001 and F-900001
-- - recreates the same sales, payments and stock movements
-- ============================================================

begin;

do $$
declare
  v_location_id uuid;
  v_seller_user_id uuid;

  v_today_lima date := timezone('America/Lima', current_timestamp)::date;
  v_sale_1_at timestamptz := ((timezone('America/Lima', current_timestamp)::date + time '10:15') at time zone 'America/Lima');
  v_sale_2_at timestamptz := ((timezone('America/Lima', current_timestamp)::date + time '12:40') at time zone 'America/Lima');
  v_sale_3_at timestamptz := (((timezone('America/Lima', current_timestamp)::date - 1) + time '17:25') at time zone 'America/Lima');

  v_sale_1_id uuid;
  v_sale_2_id uuid;
  v_sale_3_id uuid;

  r_customer_generic record;
  r_customer_dni record;
  r_customer_ruc record;

  r_variant_cash record;
  r_variant_yape record;
  r_variant_transfer_a record;
  r_variant_transfer_b record;

  v_sale_1_subtotal numeric(12,2);
  v_sale_1_tax numeric(12,2);
  v_sale_1_total numeric(12,2);

  v_sale_2_subtotal numeric(12,2);
  v_sale_2_tax numeric(12,2);
  v_sale_2_total numeric(12,2);

  v_sale_3_line_a_subtotal numeric(12,2);
  v_sale_3_line_a_tax numeric(12,2);
  v_sale_3_line_a_total numeric(12,2);
  v_sale_3_line_b_subtotal numeric(12,2);
  v_sale_3_line_b_tax numeric(12,2);
  v_sale_3_line_b_total numeric(12,2);
  v_sale_3_subtotal numeric(12,2);
  v_sale_3_tax numeric(12,2);
  v_sale_3_total numeric(12,2);
begin
  update inventory i
  set qty = i.qty + seeded_restore.qty_to_restore
  from (
    select
      s.location_id,
      sd.variant_id,
      sum(sd.quantity)::int as qty_to_restore
    from sales s
    inner join sales_details sd on sd.sale_id = s.sale_id
    where s.sale_number in ('N-900001', 'B-900001', 'F-900001')
    group by s.location_id, sd.variant_id
  ) seeded_restore
  where i.location_id = seeded_restore.location_id
    and i.variant_id = seeded_restore.variant_id;

  delete from stock_movements
  where reason like 'SEED-SALE: N-900001%'
     or reason like 'SEED-SALE: B-900001%'
     or reason like 'SEED-SALE: F-900001%';

  delete from sales
  where sale_number in ('N-900001', 'B-900001', 'F-900001');

  select l.location_id
  into v_location_id
  from locations l
  where l.code = 'TD-CENT'
    and l.active = true
  limit 1;

  if v_location_id is null then
    raise exception 'seed_sales_confirmed_demo.sql requires active location TD-CENT';
  end if;

  select u.user_id
  into v_seller_user_id
  from users u
  inner join roles r on r.role_id = u.role_id
  inner join user_locations ul
    on ul.user_id = u.user_id
   and ul.location_id = v_location_id
   and ul.is_default = true
  where u.active = true
    and r.name = 'VENTAS'
  order by u.created_at, u.user_id
  limit 1;

  if v_seller_user_id is null then
    raise exception 'seed_sales_confirmed_demo.sql requires an active VENTAS user with default location TD-CENT';
  end if;

  select
    c.customer_id,
    coalesce(c.full_name, c.business_name, c.commercial_name) as customer_name,
    c.document_type,
    c.document_number,
    c.address
  into r_customer_generic
  from customers c
  where c.internal_code = 'SALE-CLI-001'
    and c.active = true
  limit 1;

  if r_customer_generic.customer_id is null then
    raise exception 'seed_sales_confirmed_demo.sql requires customer SALE-CLI-001';
  end if;

  select
    c.customer_id,
    coalesce(c.full_name, c.business_name, c.commercial_name) as customer_name,
    c.document_type,
    c.document_number,
    c.address
  into r_customer_dni
  from customers c
  where c.internal_code = 'SALE-CLI-002'
    and c.active = true
  limit 1;

  if r_customer_dni.customer_id is null then
    raise exception 'seed_sales_confirmed_demo.sql requires customer SALE-CLI-002';
  end if;

  select
    c.customer_id,
    coalesce(c.full_name, c.business_name, c.commercial_name) as customer_name,
    c.document_type,
    c.document_number,
    c.address
  into r_customer_ruc
  from customers c
  where c.internal_code = 'SALE-CLI-003'
    and c.active = true
  limit 1;

  if r_customer_ruc.customer_id is null then
    raise exception 'seed_sales_confirmed_demo.sql requires customer SALE-CLI-003';
  end if;

  select
    pv.variant_id,
    pv.sku,
    pv.style_id,
    pv.size_id,
    i.qty as stock_qty,
    current_price.price::numeric(10,2) as unit_price
  into r_variant_cash
  from product_variants pv
  inner join inventory i
    on i.variant_id = pv.variant_id
   and i.location_id = v_location_id
  inner join lateral (
    select ssp.price
    from style_size_prices ssp
    where ssp.style_id = pv.style_id
      and ssp.size_id = pv.size_id
      and ssp.price_type = 'retail'
      and ssp.active = true
      and ssp.start_date <= v_today_lima
      and (ssp.end_date is null or ssp.end_date >= v_today_lima)
    order by ssp.start_date desc, ssp.created_at desc
    limit 1
  ) current_price on true
  where pv.sku = 'POL-FLIC-ST-UNICO'
    and coalesce(pv.active, true) = true
  limit 1;

  if r_variant_cash.variant_id is null or r_variant_cash.stock_qty < 2 then
    raise exception 'seed_sales_confirmed_demo.sql requires POL-FLIC-ST-UNICO with stock >= 2 in TD-CENT';
  end if;

  select
    pv.variant_id,
    pv.sku,
    pv.style_id,
    pv.size_id,
    i.qty as stock_qty,
    current_price.price::numeric(10,2) as unit_price
  into r_variant_yape
  from product_variants pv
  inner join inventory i
    on i.variant_id = pv.variant_id
   and i.location_id = v_location_id
  inner join lateral (
    select ssp.price
    from style_size_prices ssp
    where ssp.style_id = pv.style_id
      and ssp.size_id = pv.size_id
      and ssp.price_type = 'retail'
      and ssp.active = true
      and ssp.start_date <= v_today_lima
      and (ssp.end_date is null or ssp.end_date >= v_today_lima)
    order by ssp.start_date desc, ssp.created_at desc
    limit 1
  ) current_price on true
  where pv.sku = 'JOG-FTER-M-UNICO'
    and coalesce(pv.active, true) = true
  limit 1;

  if r_variant_yape.variant_id is null or r_variant_yape.stock_qty < 1 then
    raise exception 'seed_sales_confirmed_demo.sql requires JOG-FTER-M-UNICO with stock >= 1 in TD-CENT';
  end if;

  select
    pv.variant_id,
    pv.sku,
    pv.style_id,
    pv.size_id,
    i.qty as stock_qty,
    current_price.price::numeric(10,2) as unit_price
  into r_variant_transfer_a
  from product_variants pv
  inner join inventory i
    on i.variant_id = pv.variant_id
   and i.location_id = v_location_id
  inner join lateral (
    select ssp.price
    from style_size_prices ssp
    where ssp.style_id = pv.style_id
      and ssp.size_id = pv.size_id
      and ssp.price_type = 'retail'
      and ssp.active = true
      and ssp.start_date <= v_today_lima
      and (ssp.end_date is null or ssp.end_date >= v_today_lima)
    order by ssp.start_date desc, ssp.created_at desc
    limit 1
  ) current_price on true
  where pv.sku = 'LEG-SUP-L-UNICO'
    and coalesce(pv.active, true) = true
  limit 1;

  if r_variant_transfer_a.variant_id is null or r_variant_transfer_a.stock_qty < 1 then
    raise exception 'seed_sales_confirmed_demo.sql requires LEG-SUP-L-UNICO with stock >= 1 in TD-CENT';
  end if;

  select
    pv.variant_id,
    pv.sku,
    pv.style_id,
    pv.size_id,
    i.qty as stock_qty,
    current_price.price::numeric(10,2) as unit_price
  into r_variant_transfer_b
  from product_variants pv
  inner join inventory i
    on i.variant_id = pv.variant_id
   and i.location_id = v_location_id
  inner join lateral (
    select ssp.price
    from style_size_prices ssp
    where ssp.style_id = pv.style_id
      and ssp.size_id = pv.size_id
      and ssp.price_type = 'retail'
      and ssp.active = true
      and ssp.start_date <= v_today_lima
      and (ssp.end_date is null or ssp.end_date >= v_today_lima)
    order by ssp.start_date desc, ssp.created_at desc
    limit 1
  ) current_price on true
  where pv.sku = 'SHO-CHA-ST-UNICO'
    and coalesce(pv.active, true) = true
  limit 1;

  if r_variant_transfer_b.variant_id is null or r_variant_transfer_b.stock_qty < 1 then
    raise exception 'seed_sales_confirmed_demo.sql requires SHO-CHA-ST-UNICO with stock >= 1 in TD-CENT';
  end if;

  v_sale_1_subtotal := round((r_variant_cash.unit_price * 2)::numeric, 2);
  v_sale_1_tax := 0.00;
  v_sale_1_total := v_sale_1_subtotal;

  v_sale_2_subtotal := round(r_variant_yape.unit_price::numeric, 2);
  v_sale_2_tax := round((v_sale_2_subtotal * 0.18)::numeric, 2);
  v_sale_2_total := round((v_sale_2_subtotal + v_sale_2_tax)::numeric, 2);

  v_sale_3_line_a_subtotal := round(r_variant_transfer_a.unit_price::numeric, 2);
  v_sale_3_line_a_tax := round((v_sale_3_line_a_subtotal * 0.18)::numeric, 2);
  v_sale_3_line_a_total := round((v_sale_3_line_a_subtotal + v_sale_3_line_a_tax)::numeric, 2);

  v_sale_3_line_b_subtotal := round(r_variant_transfer_b.unit_price::numeric, 2);
  v_sale_3_line_b_tax := round((v_sale_3_line_b_subtotal * 0.18)::numeric, 2);
  v_sale_3_line_b_total := round((v_sale_3_line_b_subtotal + v_sale_3_line_b_tax)::numeric, 2);

  v_sale_3_subtotal := round((v_sale_3_line_a_subtotal + v_sale_3_line_b_subtotal)::numeric, 2);
  v_sale_3_tax := round((v_sale_3_subtotal * 0.18)::numeric, 2);
  v_sale_3_total := round((v_sale_3_subtotal + v_sale_3_tax)::numeric, 2);

  insert into sales (
    location_id,
    seller_user_id,
    customer_id,
    customer_name_text,
    customer_doc_type,
    customer_doc_number,
    customer_address_text,
    document_type,
    status,
    notes,
    currency,
    tax_rate,
    subtotal_amount,
    sale_discount_amount,
    tax_amount,
    total_amount,
    sale_number,
    created_at,
    confirmed_at,
    updated_at
  ) values (
    v_location_id,
    v_seller_user_id,
    r_customer_generic.customer_id,
    r_customer_generic.customer_name,
    r_customer_generic.document_type,
    r_customer_generic.document_number,
    r_customer_generic.address,
    'none',
    'confirmed',
    'SEED-SALE: demo cash sale for current-day cash closing base.',
    'PEN',
    0.00,
    v_sale_1_subtotal,
    0.00,
    v_sale_1_tax,
    v_sale_1_total,
    'N-900001',
    v_sale_1_at - interval '5 minutes',
    v_sale_1_at,
    v_sale_1_at
  )
  returning sale_id into v_sale_1_id;

  insert into sales_details (
    sale_id,
    variant_id,
    quantity,
    unit_price_list,
    unit_price_final,
    price_type_applied,
    pricing_basis,
    line_subtotal,
    line_tax,
    line_total,
    created_at,
    updated_at
  ) values (
    v_sale_1_id,
    r_variant_cash.variant_id,
    2,
    r_variant_cash.unit_price,
    r_variant_cash.unit_price,
    'retail',
    'auto',
    v_sale_1_subtotal,
    v_sale_1_tax,
    v_sale_1_total,
    v_sale_1_at,
    v_sale_1_at
  );

  insert into sales_payments (
    sale_id,
    method,
    amount,
    reference,
    paid_at
  ) values (
    v_sale_1_id,
    'cash',
    v_sale_1_total,
    null,
    v_sale_1_at
  );

  update inventory
  set qty = qty - 2
  where location_id = v_location_id
    and variant_id = r_variant_cash.variant_id
    and qty >= 2;

  if not found then
    raise exception 'seed_sales_confirmed_demo.sql could not discount inventory for N-900001';
  end if;

  insert into stock_movements (
    location_id,
    variant_id,
    movement_type,
    quantity,
    reason,
    reference_type,
    reference_id,
    created_by,
    created_at
  ) values (
    v_location_id,
    r_variant_cash.variant_id,
    'OUT',
    2,
    'SEED-SALE: N-900001 / current-day cash sale',
    'sale',
    v_sale_1_id,
    v_seller_user_id,
    v_sale_1_at
  );

  insert into sales (
    location_id,
    seller_user_id,
    customer_id,
    customer_name_text,
    customer_doc_type,
    customer_doc_number,
    customer_address_text,
    document_type,
    status,
    notes,
    currency,
    tax_rate,
    subtotal_amount,
    sale_discount_amount,
    tax_amount,
    total_amount,
    sale_number,
    created_at,
    confirmed_at,
    updated_at
  ) values (
    v_location_id,
    v_seller_user_id,
    r_customer_dni.customer_id,
    r_customer_dni.customer_name,
    r_customer_dni.document_type,
    r_customer_dni.document_number,
    r_customer_dni.address,
    'boleta',
    'confirmed',
    'SEED-SALE: demo yape sale for current-day cash closing base.',
    'PEN',
    0.18,
    v_sale_2_subtotal,
    0.00,
    v_sale_2_tax,
    v_sale_2_total,
    'B-900001',
    v_sale_2_at - interval '5 minutes',
    v_sale_2_at,
    v_sale_2_at
  )
  returning sale_id into v_sale_2_id;

  insert into sales_details (
    sale_id,
    variant_id,
    quantity,
    unit_price_list,
    unit_price_final,
    price_type_applied,
    pricing_basis,
    line_subtotal,
    line_tax,
    line_total,
    created_at,
    updated_at
  ) values (
    v_sale_2_id,
    r_variant_yape.variant_id,
    1,
    r_variant_yape.unit_price,
    r_variant_yape.unit_price,
    'retail',
    'auto',
    v_sale_2_subtotal,
    v_sale_2_tax,
    v_sale_2_total,
    v_sale_2_at,
    v_sale_2_at
  );

  insert into sales_payments (
    sale_id,
    method,
    amount,
    reference,
    paid_at
  ) values (
    v_sale_2_id,
    'yape',
    v_sale_2_total,
    'SEED-YAPE-002',
    v_sale_2_at
  );

  update inventory
  set qty = qty - 1
  where location_id = v_location_id
    and variant_id = r_variant_yape.variant_id
    and qty >= 1;

  if not found then
    raise exception 'seed_sales_confirmed_demo.sql could not discount inventory for B-900001';
  end if;

  insert into stock_movements (
    location_id,
    variant_id,
    movement_type,
    quantity,
    reason,
    reference_type,
    reference_id,
    created_by,
    created_at
  ) values (
    v_location_id,
    r_variant_yape.variant_id,
    'OUT',
    1,
    'SEED-SALE: B-900001 / current-day yape sale',
    'sale',
    v_sale_2_id,
    v_seller_user_id,
    v_sale_2_at
  );

  insert into sales (
    location_id,
    seller_user_id,
    customer_id,
    customer_name_text,
    customer_doc_type,
    customer_doc_number,
    customer_address_text,
    document_type,
    status,
    notes,
    currency,
    tax_rate,
    subtotal_amount,
    sale_discount_amount,
    tax_amount,
    total_amount,
    sale_number,
    created_at,
    confirmed_at,
    updated_at
  ) values (
    v_location_id,
    v_seller_user_id,
    r_customer_ruc.customer_id,
    r_customer_ruc.customer_name,
    r_customer_ruc.document_type,
    r_customer_ruc.document_number,
    r_customer_ruc.address,
    'factura',
    'confirmed',
    'SEED-SALE: demo transfer sale for previous-day cash closing base.',
    'PEN',
    0.18,
    v_sale_3_subtotal,
    0.00,
    v_sale_3_tax,
    v_sale_3_total,
    'F-900001',
    v_sale_3_at - interval '5 minutes',
    v_sale_3_at,
    v_sale_3_at
  )
  returning sale_id into v_sale_3_id;

  insert into sales_details (
    sale_id,
    variant_id,
    quantity,
    unit_price_list,
    unit_price_final,
    price_type_applied,
    pricing_basis,
    line_subtotal,
    line_tax,
    line_total,
    created_at,
    updated_at
  ) values
  (
    v_sale_3_id,
    r_variant_transfer_a.variant_id,
    1,
    r_variant_transfer_a.unit_price,
    r_variant_transfer_a.unit_price,
    'retail',
    'auto',
    v_sale_3_line_a_subtotal,
    v_sale_3_line_a_tax,
    v_sale_3_line_a_total,
    v_sale_3_at,
    v_sale_3_at
  ),
  (
    v_sale_3_id,
    r_variant_transfer_b.variant_id,
    1,
    r_variant_transfer_b.unit_price,
    r_variant_transfer_b.unit_price,
    'retail',
    'auto',
    v_sale_3_line_b_subtotal,
    v_sale_3_line_b_tax,
    v_sale_3_line_b_total,
    v_sale_3_at,
    v_sale_3_at
  );

  insert into sales_payments (
    sale_id,
    method,
    amount,
    reference,
    paid_at
  ) values (
    v_sale_3_id,
    'transfer',
    v_sale_3_total,
    'SEED-TRANSFER-003',
    v_sale_3_at
  );

  update inventory
  set qty = qty - 1
  where location_id = v_location_id
    and variant_id = r_variant_transfer_a.variant_id
    and qty >= 1;

  if not found then
    raise exception 'seed_sales_confirmed_demo.sql could not discount inventory for F-900001 line A';
  end if;

  update inventory
  set qty = qty - 1
  where location_id = v_location_id
    and variant_id = r_variant_transfer_b.variant_id
    and qty >= 1;

  if not found then
    raise exception 'seed_sales_confirmed_demo.sql could not discount inventory for F-900001 line B';
  end if;

  insert into stock_movements (
    location_id,
    variant_id,
    movement_type,
    quantity,
    reason,
    reference_type,
    reference_id,
    created_by,
    created_at
  ) values
  (
    v_location_id,
    r_variant_transfer_a.variant_id,
    'OUT',
    1,
    'SEED-SALE: F-900001 / previous-day transfer sale / LEG-SUP-L-UNICO',
    'sale',
    v_sale_3_id,
    v_seller_user_id,
    v_sale_3_at
  ),
  (
    v_location_id,
    r_variant_transfer_b.variant_id,
    'OUT',
    1,
    'SEED-SALE: F-900001 / previous-day transfer sale / SHO-CHA-ST-UNICO',
    'sale',
    v_sale_3_id,
    v_seller_user_id,
    v_sale_3_at
  );
end $$;

commit;

-- ============================================================
-- SUMMARY
-- ============================================================

select
  s.sale_number,
  l.code as location_code,
  s.document_type,
  sp.method as payment_method,
  s.total_amount,
  timezone('America/Lima', s.confirmed_at)::date as business_date_lima
from sales s
inner join locations l on l.location_id = s.location_id
inner join sales_payments sp on sp.sale_id = s.sale_id
where s.sale_number in ('N-900001', 'B-900001', 'F-900001')
order by s.confirmed_at desc, s.sale_number asc;

select
  l.code as location_code,
  timezone('America/Lima', s.confirmed_at)::date as business_date_lima,
  count(distinct s.sale_id) as confirmed_sales_count,
  coalesce(sum(case when sp.method = 'cash' then sp.amount else 0 end), 0)::numeric(12,2) as total_cash,
  coalesce(sum(case when sp.method = 'yape' then sp.amount else 0 end), 0)::numeric(12,2) as total_yape,
  coalesce(sum(case when sp.method = 'plin' then sp.amount else 0 end), 0)::numeric(12,2) as total_plin,
  coalesce(sum(case when sp.method = 'transfer' then sp.amount else 0 end), 0)::numeric(12,2) as total_transfer,
  coalesce(sum(sp.amount), 0)::numeric(12,2) as total_all
from sales s
inner join sales_payments sp on sp.sale_id = s.sale_id
inner join locations l on l.location_id = s.location_id
where s.status = 'confirmed'
  and s.sale_number in ('N-900001', 'B-900001', 'F-900001')
group by l.code, timezone('America/Lima', s.confirmed_at)::date
order by business_date_lima desc, location_code asc;
