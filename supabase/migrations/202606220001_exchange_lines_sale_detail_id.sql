begin;

alter table exchange_lines add column if not exists sale_detail_id uuid references sales_details(sale_detail_id);

create index if not exists idx_exchange_lines_sale_detail on exchange_lines(sale_detail_id);

commit;
