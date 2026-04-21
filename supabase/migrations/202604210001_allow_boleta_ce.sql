begin;

alter table sales
  drop constraint if exists chk_sales_boleta_requires_dni;

alter table sales
  add constraint chk_sales_boleta_requires_dni
    check (
      status <> 'confirmed'
      or document_type <> 'boleta'
      or (
        customer_name_text is not null
        and customer_doc_type in ('dni', 'ce')
        and customer_doc_number is not null
      )
    );

commit;
