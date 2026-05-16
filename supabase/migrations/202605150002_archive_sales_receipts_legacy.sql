-- Archivo legado: la tabla sales_receipts se conserva solo para auditoria
-- historica y ya no participa en el flujo operativo de ventas.

COMMENT ON TABLE sales_receipts IS
'Tabla legada de integracion documental archivada. No participa en el flujo operativo actual de ventas.';
