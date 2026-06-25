begin;

alter table cash_closings
  add column if not exists opening_balance numeric(12,2) not null default 0
    check (opening_balance >= 0),
  add column if not exists closing_balance_declared numeric(12,2);

commit;
