-- ============================================================
-- RIPNEL operational 30-day seed
-- Purpose: create a stable 30-day mixed operational history in
-- an existing Supabase database using real stock documents.
--
-- Recommended execution order:
-- 1) database/seed_access_control.sql
-- 2) database/seed_operational_mvp.sql
-- 3) supabase/seed.sql
-- 4) supabase/seed_styles_legacy.sql
-- 5) database/seed_variants_inventory.sql
-- 6) database/seed_style_size_prices.sql
-- 7) database/seed_sales_mvp.sql
-- 8) this file
--
-- Scope:
-- - rewrites only the demo subset for ALM-CENT, TD-CENT and TD-MONT
-- - uses inventory adjustments as the formal "product intake" document
-- - seeds transfers, confirmed sales and kardex movements for 30 days
-- - leaves the subset with a deterministic final stock state
--
-- Safety:
-- - deletes only records created by this seed using SEED-30D prefixes
-- - resets only inventory rows for the seed subset
-- - safe to re-run on the shared demo Supabase base
-- ============================================================

begin;

create temp table seed_30d_variants (
  sku varchar(60) primary key
);

insert into seed_30d_variants (sku)
values
  ('JOG-FTER-S-UNICO'),
  ('JOG-FTER-M-UNICO'),
  ('JOG-FTER-L-UNICO'),
  ('JOG-FTER-XL-UNICO'),
  ('LEG-SUP-S-UNICO'),
  ('LEG-SUP-M-UNICO'),
  ('LEG-SUP-L-UNICO'),
  ('LEG-SUP-XL-UNICO'),
  ('POL-FLIC-ST-UNICO'),
  ('POL-FLIC-L-UNICO'),
  ('POL-FLIC-XL-UNICO'),
  ('SHO-CHA-ST-UNICO');

create temp table seed_30d_opening (
  location_code varchar(20) not null,
  sku varchar(60) not null,
  qty int not null check (qty >= 0),
  primary key (location_code, sku)
);

insert into seed_30d_opening (location_code, sku, qty)
values
  ('ALM-CENT', 'JOG-FTER-S-UNICO', 18),
  ('ALM-CENT', 'JOG-FTER-M-UNICO', 20),
  ('ALM-CENT', 'JOG-FTER-L-UNICO', 18),
  ('ALM-CENT', 'JOG-FTER-XL-UNICO', 12),
  ('TD-CENT',  'JOG-FTER-S-UNICO', 6),
  ('TD-CENT',  'JOG-FTER-M-UNICO', 7),
  ('TD-CENT',  'JOG-FTER-L-UNICO', 6),
  ('TD-CENT',  'JOG-FTER-XL-UNICO', 4),
  ('TD-MONT',  'JOG-FTER-S-UNICO', 4),
  ('TD-MONT',  'JOG-FTER-M-UNICO', 5),
  ('TD-MONT',  'JOG-FTER-L-UNICO', 4),
  ('TD-MONT',  'JOG-FTER-XL-UNICO', 3),
  ('ALM-CENT', 'LEG-SUP-S-UNICO', 22),
  ('ALM-CENT', 'LEG-SUP-M-UNICO', 24),
  ('ALM-CENT', 'LEG-SUP-L-UNICO', 22),
  ('ALM-CENT', 'LEG-SUP-XL-UNICO', 16),
  ('TD-CENT',  'LEG-SUP-S-UNICO', 8),
  ('TD-CENT',  'LEG-SUP-M-UNICO', 8),
  ('TD-CENT',  'LEG-SUP-L-UNICO', 6),
  ('TD-CENT',  'LEG-SUP-XL-UNICO', 5),
  ('TD-MONT',  'LEG-SUP-S-UNICO', 6),
  ('TD-MONT',  'LEG-SUP-M-UNICO', 6),
  ('TD-MONT',  'LEG-SUP-L-UNICO', 5),
  ('TD-MONT',  'LEG-SUP-XL-UNICO', 4),
  ('ALM-CENT', 'POL-FLIC-ST-UNICO', 14),
  ('ALM-CENT', 'POL-FLIC-L-UNICO', 10),
  ('ALM-CENT', 'POL-FLIC-XL-UNICO', 8),
  ('TD-CENT',  'POL-FLIC-ST-UNICO', 5),
  ('TD-CENT',  'POL-FLIC-L-UNICO', 4),
  ('TD-CENT',  'POL-FLIC-XL-UNICO', 3),
  ('TD-MONT',  'POL-FLIC-ST-UNICO', 3),
  ('TD-MONT',  'POL-FLIC-L-UNICO', 2),
  ('TD-MONT',  'POL-FLIC-XL-UNICO', 2),
  ('ALM-CENT', 'SHO-CHA-ST-UNICO', 12),
  ('TD-CENT',  'SHO-CHA-ST-UNICO', 4),
  ('TD-MONT',  'SHO-CHA-ST-UNICO', 3);

create temp table seed_30d_adjust_events (
  seq int primary key,
  day_offset int not null check (day_offset between 0 and 29),
  location_code varchar(20) not null,
  sku varchar(60) not null,
  qty_increase int not null check (qty_increase > 0),
  reason_suffix varchar(120) not null
);

insert into seed_30d_adjust_events (seq, day_offset, location_code, sku, qty_increase, reason_suffix)
values
  (1, 24, 'ALM-CENT', 'POL-FLIC-ST-UNICO', 6, 'regularizacion lote A1'),
  (2, 19, 'ALM-CENT', 'JOG-FTER-M-UNICO', 5, 'ingreso controlado joggers'),
  (3, 13, 'TD-CENT',  'LEG-SUP-L-UNICO', 2, 'regularizacion por conteo tienda centro'),
  (4, 8,  'ALM-CENT', 'SHO-CHA-ST-UNICO', 4, 'reposicion por recepcion interna'),
  (5, 3,  'TD-MONT',  'POL-FLIC-L-UNICO', 2, 'regularizacion por conteo tienda montevideo');

create temp table seed_30d_transfer_events (
  seq int primary key,
  day_offset int not null check (day_offset between 0 and 29),
  from_location_code varchar(20) not null,
  to_location_code varchar(20) not null,
  sku varchar(60) not null,
  qty int not null check (qty > 0)
);

insert into seed_30d_transfer_events (seq, day_offset, from_location_code, to_location_code, sku, qty)
values
  (1, 26, 'ALM-CENT', 'TD-CENT', 'POL-FLIC-ST-UNICO', 4),
  (2, 21, 'ALM-CENT', 'TD-MONT', 'JOG-FTER-M-UNICO', 3),
  (3, 16, 'ALM-CENT', 'TD-CENT', 'LEG-SUP-L-UNICO', 3),
  (4, 11, 'ALM-CENT', 'TD-MONT', 'POL-FLIC-L-UNICO', 2),
  (5, 6,  'ALM-CENT', 'TD-CENT', 'SHO-CHA-ST-UNICO', 2),
  (6, 1,  'ALM-CENT', 'TD-MONT', 'LEG-SUP-M-UNICO', 2);

create temp table seed_30d_sale_events (
  seq int primary key,
  day_offset int not null check (day_offset between 0 and 29),
  location_code varchar(20) not null,
  sku varchar(60) not null,
  qty int not null check (qty > 0),
  document_type varchar(20) not null,
  payment_method varchar(20) not null,
  customer_code varchar(30) not null,
  minute_offset int not null
);

insert into seed_30d_sale_events (
  seq,
  day_offset,
  location_code,
  sku,
  qty,
  document_type,
  payment_method,
  customer_code,
  minute_offset
)
select
  gs + 1 as seq,
  gs as day_offset,
  case when mod(gs, 2) = 0 then 'TD-CENT' else 'TD-MONT' end as location_code,
  (array[
    'JOG-FTER-S-UNICO',
    'JOG-FTER-M-UNICO',
    'LEG-SUP-S-UNICO',
    'LEG-SUP-M-UNICO',
    'JOG-FTER-L-UNICO',
    'LEG-SUP-L-UNICO'
  ])[mod(gs, 6) + 1] as sku,
  case when gs in (8, 18, 28) then 2 else 1 end as qty,
  (array['none', 'boleta', 'factura'])[mod(gs, 3) + 1] as document_type,
  (array['cash', 'yape', 'transfer', 'plin'])[mod(gs, 4) + 1] as payment_method,
  (array['SALE-CLI-001', 'SALE-CLI-002', 'SALE-CLI-003'])[mod(gs, 3) + 1] as customer_code,
  600 + (mod(gs, 5) * 35) as minute_offset
from generate_series(0, 29) gs;

create temp table seed_30d_expected_final_stock as
with opening as (
  select
    location_code,
    sku,
    qty::int as opening_qty
  from seed_30d_opening
),
adjustments as (
  select
    location_code,
    sku,
    sum(qty_increase)::int as adjustment_qty
  from seed_30d_adjust_events
  group by location_code, sku
),
transfer_out as (
  select
    from_location_code as location_code,
    sku,
    sum(qty)::int as transfer_out_qty
  from seed_30d_transfer_events
  group by from_location_code, sku
),
transfer_in as (
  select
    to_location_code as location_code,
    sku,
    sum(qty)::int as transfer_in_qty
  from seed_30d_transfer_events
  group by to_location_code, sku
),
sales as (
  select
    location_code,
    sku,
    sum(qty)::int as sold_qty
  from seed_30d_sale_events
  group by location_code, sku
)
select
  o.location_code,
  o.sku,
  (
    o.opening_qty
    + coalesce(a.adjustment_qty, 0)
    + coalesce(ti.transfer_in_qty, 0)
    - coalesce(to2.transfer_out_qty, 0)
    - coalesce(s.sold_qty, 0)
  )::int as expected_qty
from opening o
left join adjustments a
  on a.location_code = o.location_code
 and a.sku = o.sku
left join transfer_in ti
  on ti.location_code = o.location_code
 and ti.sku = o.sku
left join transfer_out to2
  on to2.location_code = o.location_code
 and to2.sku = o.sku
left join sales s
  on s.location_code = o.location_code
 and s.sku = o.sku;

do $$
declare
  v_today_lima date := timezone('America/Lima', current_timestamp)::date;
  v_opening_day date := timezone('America/Lima', current_timestamp)::date - 29;

  v_user_warehouse uuid;
  v_user_sales uuid;

  v_location_alm uuid;
  v_location_td_cent uuid;
  v_location_td_mont uuid;
  v_location_id uuid;
  v_from_location_id uuid;
  v_to_location_id uuid;

  v_sale_id uuid;
  v_transfer_id uuid;
  v_transfer_line_id uuid;
  v_adjustment_id uuid;
  v_adjustment_line_id uuid;

  v_variant_id uuid;
  v_style_id uuid;
  v_size_id uuid;
  v_current_qty int;
  v_counted_qty int;
  v_unit_price numeric(10,2);
  v_tax_rate numeric(5,4);
  v_subtotal numeric(12,2);
  v_tax numeric(12,2);
  v_total numeric(12,2);

  v_sale_at timestamptz;
  v_created_at timestamptz;
  v_shipped_at timestamptz;
  v_received_at timestamptz;
  v_confirmed_at timestamptz;

  v_customer_id uuid;
  v_customer_name varchar(160);
  v_customer_doc_type varchar(20);
  v_customer_doc_number varchar(30);
  v_customer_address varchar(255);

  v_doc_prefix varchar(1);
  v_sale_number varchar(30);
  v_payment_reference varchar(80);

  r_location record;
  r_opening record;
  r_adjustment record;
  r_transfer record;
  r_sale record;
  r_expected record;
begin
  select user_id into v_user_warehouse
  from users
  where username = 'almacen'
    and active = true
  limit 1;

  if v_user_warehouse is null then
    raise exception 'seed_operational_30_days.sql requires active user "almacen"';
  end if;

  select user_id into v_user_sales
  from users
  where username = 'ventas'
    and active = true
  limit 1;

  if v_user_sales is null then
    raise exception 'seed_operational_30_days.sql requires active user "ventas"';
  end if;

  select location_id into v_location_alm
  from locations
  where code = 'ALM-CENT'
    and active = true
  limit 1;

  select location_id into v_location_td_cent
  from locations
  where code = 'TD-CENT'
    and active = true
  limit 1;

  select location_id into v_location_td_mont
  from locations
  where code = 'TD-MONT'
    and active = true
  limit 1;

  if v_location_alm is null or v_location_td_cent is null or v_location_td_mont is null then
    raise exception 'seed_operational_30_days.sql requires active locations ALM-CENT, TD-CENT and TD-MONT';
  end if;

  if exists (
    select 1
    from seed_30d_variants sv
    left join product_variants pv on pv.sku = sv.sku
    where pv.variant_id is null
  ) then
    raise exception 'seed_operational_30_days.sql requires the demo variant subset from database/seed_variants_inventory.sql';
  end if;

  if exists (
    select 1
    from seed_30d_sale_events se
    left join customers c on c.internal_code = se.customer_code and c.active = true
    where c.customer_id is null
  ) then
    raise exception 'seed_operational_30_days.sql requires SALE-CLI-001/002/003 from database/seed_sales_mvp.sql';
  end if;

  delete from stock_movements
  where reason like 'SEED-30D:%';

  delete from inventory_adjustments
  where adjustment_number like 'A30D-%'
     or coalesce(notes, '') like 'SEED-30D:%';

  delete from stock_transfers
  where transfer_number like 'T30D-%'
     or coalesce(notes, '') like 'SEED-30D:%';

  delete from sales
  where coalesce(notes, '') like 'SEED-30D:%';

  delete from inventory i
  using locations l, product_variants pv, seed_30d_variants sv
  where i.location_id = l.location_id
    and i.variant_id = pv.variant_id
    and pv.sku = sv.sku
    and l.code in ('ALM-CENT', 'TD-CENT', 'TD-MONT');

  for r_location in
    select *
    from (
      values
        ('ALM-CENT', v_location_alm, 'A30D-OPEN-ALM', 8, 20),
        ('TD-CENT', v_location_td_cent, 'A30D-OPEN-TDC', 8, 32),
        ('TD-MONT', v_location_td_mont, 'A30D-OPEN-TDM', 8, 44)
    ) as locations_seed(location_code, location_id, adjustment_number, hour_created, minute_confirmed)
  loop
    v_created_at :=
      ((v_opening_day + make_time(r_location.hour_created, 0, 0)) at time zone 'America/Lima');
    v_confirmed_at :=
      ((v_opening_day + make_time(r_location.hour_created, r_location.minute_confirmed, 0)) at time zone 'America/Lima');

    insert into inventory_adjustments (
      adjustment_number,
      location_id,
      status,
      reason,
      notes,
      created_by,
      confirmed_by,
      created_at,
      confirmed_at,
      updated_at
    ) values (
      r_location.adjustment_number,
      r_location.location_id,
      'confirmed',
      'SEED-30D: apertura base 30 dias',
      'SEED-30D: apertura inicial estable del subset operativo',
      v_user_warehouse,
      v_user_warehouse,
      v_created_at,
      v_confirmed_at,
      v_confirmed_at
    )
    returning adjustment_id into v_adjustment_id;

    for r_opening in
      select sku, qty
      from seed_30d_opening
      where location_code = r_location.location_code
      order by sku
    loop
      select pv.variant_id
      into v_variant_id
      from product_variants pv
      where pv.sku = r_opening.sku
      limit 1;

      insert into inventory_adjustment_lines (
        adjustment_id,
        variant_id,
        system_qty,
        counted_qty,
        notes
      ) values (
        v_adjustment_id,
        v_variant_id,
        0,
        r_opening.qty,
        'SEED-30D: apertura base'
      )
      returning adjustment_line_id into v_adjustment_line_id;

      insert into inventory (
        location_id,
        variant_id,
        qty
      ) values (
        r_location.location_id,
        v_variant_id,
        r_opening.qty
      );

      insert into stock_movements (
        location_id,
        variant_id,
        movement_type,
        quantity,
        reason,
        reference_type,
        reference_id,
        reference_line_id,
        created_by,
        created_at
      ) values (
        r_location.location_id,
        v_variant_id,
        'ADJUST',
        r_opening.qty,
        'SEED-30D: apertura base 30 dias',
        'adjustment',
        v_adjustment_id,
        v_adjustment_line_id,
        v_user_warehouse,
        v_confirmed_at
      );
    end loop;
  end loop;

  for r_adjustment in
    select *
    from seed_30d_adjust_events
    order by day_offset desc, seq
  loop
    v_created_at :=
      (((v_today_lima - r_adjustment.day_offset) + time '09:10') at time zone 'America/Lima');
    v_confirmed_at :=
      (((v_today_lima - r_adjustment.day_offset) + time '09:35') at time zone 'America/Lima');

    select
      l.location_id,
      pv.variant_id,
      coalesce(i.qty, 0)::int
    into
      v_location_id,
      v_variant_id,
      v_current_qty
    from locations l
    inner join product_variants pv on pv.sku = r_adjustment.sku
    left join inventory i
      on i.location_id = l.location_id
     and i.variant_id = pv.variant_id
    where l.code = r_adjustment.location_code
    limit 1;

    v_counted_qty := v_current_qty + r_adjustment.qty_increase;

    insert into inventory_adjustments (
      adjustment_number,
      location_id,
      status,
      reason,
      notes,
      created_by,
      confirmed_by,
      created_at,
      confirmed_at,
      updated_at
    ) values (
      format('A30D-ADJ-%s', lpad(r_adjustment.seq::text, 3, '0')),
      v_location_id,
      'confirmed',
      format('SEED-30D: ingreso por ajuste - %s', r_adjustment.reason_suffix),
      format('SEED-30D: ajuste confirmado para %s en %s', r_adjustment.sku, r_adjustment.location_code),
      v_user_warehouse,
      v_user_warehouse,
      v_created_at,
      v_confirmed_at,
      v_confirmed_at
    )
    returning adjustment_id into v_adjustment_id;

    insert into inventory_adjustment_lines (
      adjustment_id,
      variant_id,
      system_qty,
      counted_qty,
      notes
    ) values (
      v_adjustment_id,
      v_variant_id,
      v_current_qty,
      v_counted_qty,
      format('SEED-30D: +%s unidades', r_adjustment.qty_increase)
    )
    returning adjustment_line_id into v_adjustment_line_id;

    update inventory
    set qty = v_counted_qty
    where location_id = v_location_id
      and variant_id = v_variant_id;

    insert into stock_movements (
      location_id,
      variant_id,
      movement_type,
      quantity,
      reason,
      reference_type,
      reference_id,
      reference_line_id,
      created_by,
      created_at
    ) values (
      v_location_id,
      v_variant_id,
      'ADJUST',
      r_adjustment.qty_increase,
      format('SEED-30D: ingreso por ajuste - %s', r_adjustment.reason_suffix),
      'adjustment',
      v_adjustment_id,
      v_adjustment_line_id,
      v_user_warehouse,
      v_confirmed_at
    );
  end loop;

  for r_transfer in
    select *
    from seed_30d_transfer_events
    order by day_offset desc, seq
  loop
    v_created_at :=
      (((v_today_lima - r_transfer.day_offset) + time '08:20') at time zone 'America/Lima');
    v_shipped_at :=
      (((v_today_lima - r_transfer.day_offset) + time '10:00') at time zone 'America/Lima');
    v_received_at :=
      (((v_today_lima - r_transfer.day_offset) + time '15:10') at time zone 'America/Lima');

    select
      l_from.location_id as from_location_id,
      l_to.location_id as to_location_id,
      pv.variant_id
    into
      v_from_location_id,
      v_to_location_id,
      v_variant_id
    from locations l_from
    inner join locations l_to on l_to.code = r_transfer.to_location_code
    inner join product_variants pv on pv.sku = r_transfer.sku
    where l_from.code = r_transfer.from_location_code
    limit 1;

    select qty::int
    into v_current_qty
    from inventory
    where location_id = v_from_location_id
      and variant_id = v_variant_id
    for update;

    if v_current_qty is null or v_current_qty < r_transfer.qty then
      raise exception
        'seed_operational_30_days.sql transfer % cannot ship %, stock available: %',
        r_transfer.seq, r_transfer.sku, coalesce(v_current_qty, 0);
    end if;

    insert into stock_transfers (
      transfer_number,
      from_location_id,
      to_location_id,
      status,
      notes,
      created_by,
      shipped_by,
      received_by,
      created_at,
      shipped_at,
      received_at,
      updated_at
    ) values (
      format('T30D-%s', lpad(r_transfer.seq::text, 3, '0')),
      v_from_location_id,
      v_to_location_id,
      'received',
      format('SEED-30D: transferencia %s %s -> %s', r_transfer.sku, r_transfer.from_location_code, r_transfer.to_location_code),
      v_user_warehouse,
      v_user_warehouse,
      v_user_sales,
      v_created_at,
      v_shipped_at,
      v_received_at,
      v_received_at
    )
    returning transfer_id into v_transfer_id;

    insert into stock_transfer_lines (
      transfer_id,
      variant_id,
      qty_requested,
      qty_shipped,
      qty_received,
      notes
    ) values (
      v_transfer_id,
      v_variant_id,
      r_transfer.qty,
      r_transfer.qty,
      r_transfer.qty,
      'SEED-30D: linea de transferencia recibida'
    )
    returning transfer_line_id into v_transfer_line_id;

    update inventory
    set qty = qty - r_transfer.qty
    where location_id = v_from_location_id
      and variant_id = v_variant_id;

    insert into inventory (
      location_id,
      variant_id,
      qty
    )
    values (
      v_to_location_id,
      v_variant_id,
      r_transfer.qty
    )
    on conflict (location_id, variant_id) do update
    set qty = inventory.qty + excluded.qty;

    insert into stock_movements (
      location_id,
      variant_id,
      movement_type,
      quantity,
      reason,
      reference_type,
      reference_id,
      reference_line_id,
      created_by,
      created_at
    ) values
    (
      v_from_location_id,
      v_variant_id,
      'OUT',
      r_transfer.qty,
      format('SEED-30D: transferencia %s despachada', format('T30D-%s', lpad(r_transfer.seq::text, 3, '0'))),
      'transfer',
      v_transfer_id,
      v_transfer_line_id,
      v_user_warehouse,
      v_shipped_at
    ),
    (
      v_to_location_id,
      v_variant_id,
      'IN',
      r_transfer.qty,
      format('SEED-30D: transferencia %s recibida', format('T30D-%s', lpad(r_transfer.seq::text, 3, '0'))),
      'transfer',
      v_transfer_id,
      v_transfer_line_id,
      v_user_sales,
      v_received_at
    );
  end loop;

  for r_sale in
    select *
    from seed_30d_sale_events
    order by day_offset desc, seq
  loop
    v_sale_at :=
      (((v_today_lima - r_sale.day_offset) + make_interval(mins => r_sale.minute_offset)) at time zone 'America/Lima');
    v_created_at := v_sale_at - interval '5 minutes';

    select
      c.customer_id,
      coalesce(c.full_name, c.business_name, c.commercial_name),
      c.document_type,
      c.document_number,
      c.address
    into
      v_customer_id,
      v_customer_name,
      v_customer_doc_type,
      v_customer_doc_number,
      v_customer_address
    from customers c
    where c.internal_code = r_sale.customer_code
      and c.active = true
    limit 1;

    select
      l.location_id,
      pv.variant_id,
      pv.style_id,
      pv.size_id,
      i.qty::int
    into
      v_location_id,
      v_variant_id,
      v_style_id,
      v_size_id,
      v_current_qty
    from locations l
    inner join product_variants pv on pv.sku = r_sale.sku
    inner join inventory i
      on i.location_id = l.location_id
     and i.variant_id = pv.variant_id
    where l.code = r_sale.location_code
    limit 1;

    if v_current_qty < r_sale.qty then
      raise exception
        'seed_operational_30_days.sql sale % cannot discount %, stock available: %',
        r_sale.seq, r_sale.sku, v_current_qty;
    end if;

    select ssp.price::numeric(10,2)
    into v_unit_price
    from style_size_prices ssp
    where ssp.style_id = v_style_id
      and ssp.size_id = v_size_id
      and ssp.price_type = 'retail'
      and ssp.active = true
      and ssp.start_date <= (v_today_lima - r_sale.day_offset)
      and (ssp.end_date is null or ssp.end_date >= (v_today_lima - r_sale.day_offset))
    order by ssp.start_date desc, ssp.created_at desc
    limit 1;

    if v_unit_price is null then
      raise exception
        'seed_operational_30_days.sql missing retail price for % on %',
        r_sale.sku, (v_today_lima - r_sale.day_offset);
    end if;

    if r_sale.document_type = 'none' then
      v_tax_rate := 0.00;
      v_doc_prefix := 'N';
    elsif r_sale.document_type = 'boleta' then
      v_tax_rate := 0.18;
      v_doc_prefix := 'B';
    else
      v_tax_rate := 0.18;
      v_doc_prefix := 'F';
    end if;

    v_subtotal := round((v_unit_price * r_sale.qty)::numeric, 2);
    v_tax := round((v_subtotal * v_tax_rate)::numeric, 2);
    v_total := round((v_subtotal + v_tax)::numeric, 2);
    v_sale_number := format('%s-%s', v_doc_prefix, lpad((930000 + r_sale.seq)::text, 6, '0'));
    v_payment_reference :=
      case
        when r_sale.payment_method = 'cash' then null
        else format('SEED-30D-%s-%s', upper(r_sale.payment_method), lpad(r_sale.seq::text, 3, '0'))
      end;

    insert into sales (
      sale_number,
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
      created_at,
      confirmed_at,
      updated_at
    ) values (
      v_sale_number,
      v_location_id,
      v_user_sales,
      v_customer_id,
      v_customer_name,
      v_customer_doc_type,
      v_customer_doc_number,
      v_customer_address,
      r_sale.document_type,
      'confirmed',
      format('SEED-30D: venta demo %s %s', r_sale.location_code, r_sale.sku),
      'PEN',
      v_tax_rate,
      v_subtotal,
      0.00,
      v_tax,
      v_total,
      v_created_at,
      v_sale_at,
      v_sale_at
    )
    returning sale_id into v_sale_id;

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
      v_sale_id,
      v_variant_id,
      r_sale.qty,
      v_unit_price,
      v_unit_price,
      'retail',
      'auto',
      v_subtotal,
      v_tax,
      v_total,
      v_sale_at,
      v_sale_at
    );

    insert into sales_payments (
      sale_id,
      method,
      amount,
      reference,
      paid_at
    ) values (
      v_sale_id,
      r_sale.payment_method,
      v_total,
      v_payment_reference,
      v_sale_at
    );

    update inventory
    set qty = qty - r_sale.qty
    where location_id = v_location_id
      and variant_id = v_variant_id;

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
      v_variant_id,
      'OUT',
      r_sale.qty,
      format('SEED-30D: venta %s / %s / %s', v_sale_number, r_sale.location_code, r_sale.sku),
      'sale',
      v_sale_id,
      v_user_sales,
      v_sale_at
    );
  end loop;

  if (
    select count(distinct timezone('America/Lima', created_at)::date)
    from stock_movements
    where reason like 'SEED-30D:%'
  ) <> 30 then
    raise exception 'seed_operational_30_days.sql expected 30 active kardex dates';
  end if;

  if exists (
    select 1
    from inventory_adjustments
    where adjustment_number like 'A30D-%'
      and status <> 'confirmed'
  ) then
    raise exception 'seed_operational_30_days.sql found non-confirmed seed adjustments';
  end if;

  for r_expected in
    select *
    from seed_30d_expected_final_stock
    order by location_code, sku
  loop
    select coalesce(i.qty, 0)::int
    into v_current_qty
    from locations l
    left join product_variants pv on pv.sku = r_expected.sku
    left join inventory i
      on i.location_id = l.location_id
     and i.variant_id = pv.variant_id
    where l.code = r_expected.location_code
    limit 1;

    if v_current_qty <> r_expected.expected_qty then
      raise exception
        'seed_operational_30_days.sql final stock mismatch for % / %: expected %, got %',
        r_expected.location_code, r_expected.sku, r_expected.expected_qty, v_current_qty;
    end if;
  end loop;
end $$;

commit;

-- ============================================================
-- SUMMARY
-- ============================================================

select
  'adjustments' as document_type,
  count(*)::int as document_count
from inventory_adjustments
where adjustment_number like 'A30D-%'

union all

select
  'transfers' as document_type,
  count(*)::int as document_count
from stock_transfers
where transfer_number like 'T30D-%'

union all

select
  'sales' as document_type,
  count(*)::int as document_count
from sales
where coalesce(notes, '') like 'SEED-30D:%';

select
  min(timezone('America/Lima', created_at)::date) as first_business_date_lima,
  max(timezone('America/Lima', created_at)::date) as last_business_date_lima,
  count(distinct timezone('America/Lima', created_at)::date)::int as active_days_lima
from stock_movements
where reason like 'SEED-30D:%';

select
  l.code as location_code,
  pv.sku,
  i.qty
from inventory i
inner join locations l on l.location_id = i.location_id
inner join product_variants pv on pv.variant_id = i.variant_id
inner join seed_30d_variants sv on sv.sku = pv.sku
where l.code in ('ALM-CENT', 'TD-CENT', 'TD-MONT')
order by l.code, pv.sku;
