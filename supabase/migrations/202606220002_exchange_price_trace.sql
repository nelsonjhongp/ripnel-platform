begin;

alter table exchanges
  add column if not exists original_total numeric(12,2) not null default 0 check (original_total >= 0),
  add column if not exists replacement_total numeric(12,2) not null default 0 check (replacement_total >= 0),
  add column if not exists difference_amount numeric(12,2) not null default 0,
  add column if not exists settlement_type varchar(20) not null default 'none',
  add column if not exists settlement_payment_id uuid references sales_payments(payment_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'exchanges_settlement_type_check'
      and conrelid = 'exchanges'::regclass
  ) then
    alter table exchanges
      add constraint exchanges_settlement_type_check
      check (settlement_type in ('none', 'charge', 'refund_pending', 'credit_pending'));
  end if;
end $$;

alter table exchange_lines
  add column if not exists unit_price_list numeric(10,2),
  add column if not exists unit_price_final numeric(10,2),
  add column if not exists line_subtotal numeric(12,2) not null default 0 check (line_subtotal >= 0),
  add column if not exists line_tax numeric(12,2) not null default 0 check (line_tax >= 0),
  add column if not exists line_total numeric(12,2) not null default 0 check (line_total >= 0),
  add column if not exists price_source varchar(30);

create index if not exists idx_exchanges_settlement_payment
  on exchanges(settlement_payment_id);

commit;
