const React = require('react');
const {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} = require('@react-pdf/renderer');

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 10,
    color: '#111827',
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#4b5563',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 12,
  },
  section: {
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    borderBottomStyle: 'solid',
    paddingBottom: 6,
    marginBottom: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    borderBottomStyle: 'solid',
    paddingBottom: 4,
    marginBottom: 4,
  },
  colDesc: {
    width: '44%',
    paddingRight: 8,
  },
  colQty: {
    width: '14%',
    textAlign: 'right',
    paddingRight: 8,
  },
  colUnit: {
    width: '20%',
    textAlign: 'right',
    paddingRight: 8,
  },
  colTotal: {
    width: '22%',
    textAlign: 'right',
  },
  totals: {
    marginTop: 8,
    alignSelf: 'flex-end',
    width: '44%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  footer: {
    marginTop: 14,
    fontSize: 9,
    color: '#6b7280',
  },
});

function amount(value) {
  const parsed = Number(value);
  const safe = Number.isFinite(parsed) ? parsed : 0;
  return `S/ ${safe.toFixed(2)}`;
}

function text(value, fallbackValue = '-') {
  if (value === undefined || value === null) {
    return fallbackValue;
  }

  const normalized = String(value).trim();
  return normalized || fallbackValue;
}

function formatDate(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toISOString().slice(0, 10);
}

function buildItemsRows(details) {
  const safeDetails = Array.isArray(details) ? details : [];

  return safeDetails.map((detail, index) =>
    React.createElement(
      View,
      { key: `${detail.variant_id || 'item'}-${index}`, style: styles.tableRow },
      React.createElement(Text, { style: styles.colDesc }, text(detail.style_name || detail.sku)),
      React.createElement(Text, { style: styles.colQty }, text(detail.quantity, '0')),
      React.createElement(Text, { style: styles.colUnit }, amount(detail.unit_price_final)),
      React.createElement(Text, { style: styles.colTotal }, amount(detail.line_total))
    )
  );
}

function createProformaDocument(sale) {
  const itemsRows = buildItemsRows(sale.details);

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.title }, 'PROFORMA'),
        React.createElement(Text, { style: styles.subtitle }, `Nro: ${text(sale.sale_number)}`)
      ),
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, null, `Fecha: ${formatDate(sale.confirmed_at || sale.created_at)}`),
          React.createElement(Text, null, `Moneda: ${text(sale.currency, 'PEN')}`)
        ),
        React.createElement(Text, null, `Cliente: ${text(sale.customer_name_text)}`),
        React.createElement(Text, null, `Documento: ${text(sale.customer_doc_type)}/${text(sale.customer_doc_number)}`)
      ),
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(
          View,
          { style: styles.tableHeader },
          React.createElement(Text, { style: styles.colDesc }, 'Descripcion'),
          React.createElement(Text, { style: styles.colQty }, 'Cant.'),
          React.createElement(Text, { style: styles.colUnit }, 'P.Unit'),
          React.createElement(Text, { style: styles.colTotal }, 'Importe')
        ),
        ...itemsRows
      ),
      React.createElement(
        View,
        { style: styles.totals },
        React.createElement(
          View,
          { style: styles.totalRow },
          React.createElement(Text, null, 'Subtotal'),
          React.createElement(Text, null, amount(sale.subtotal_amount))
        ),
        React.createElement(
          View,
          { style: styles.totalRow },
          React.createElement(Text, null, 'IGV'),
          React.createElement(Text, null, amount(sale.tax_amount))
        ),
        React.createElement(
          View,
          { style: styles.totalRow },
          React.createElement(Text, null, 'Total'),
          React.createElement(Text, null, amount(sale.total_amount))
        )
      ),
      React.createElement(
        Text,
        { style: styles.footer },
        'Documento referencial de cotizacion. No reemplaza un comprobante emitido.'
      )
    )
  );
}

async function renderProformaSalePdfBuffer(sale) {
  const doc = createProformaDocument(sale || {});
  return renderToBuffer(doc);
}

module.exports = {
  renderProformaSalePdfBuffer,
};
