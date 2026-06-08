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
    padding: 32,
    fontSize: 10,
    color: '#111827',
    fontFamily: 'Helvetica',
  },
  companyName: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 0.6,
    color: '#1e1b4b',
  },
  docType: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#4c1d95',
    marginBottom: 2,
  },
  docNumber: {
    fontSize: 12,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 4,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    borderBottomStyle: 'solid',
    marginBottom: 10,
    marginTop: 6,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#6b7280',
    marginBottom: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
    gap: 12,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 8,
  },
  col: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1.5,
    borderBottomColor: '#9ca3af',
    borderBottomStyle: 'solid',
    paddingBottom: 5,
    marginBottom: 2,
    paddingTop: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
    paddingBottom: 3,
    paddingTop: 3,
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
    marginTop: 10,
    alignSelf: 'flex-end',
    width: '48%',
    borderTopWidth: 0.5,
    borderTopColor: '#9ca3af',
    borderTopStyle: 'solid',
    paddingTop: 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  totalRowBold: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
    marginTop: 4,
  },
  totalLabelBold: {
    fontSize: 11,
    fontWeight: 700,
  },
  totalValueBold: {
    fontSize: 11,
    fontWeight: 700,
  },
  payments: {
    marginTop: 8,
    marginBottom: 10,
  },
  paymentRow: {
    flexDirection: 'row',
    marginBottom: 2,
    gap: 12,
    fontSize: 9,
    color: '#4b5563',
  },
  footer: {
    marginTop: 16,
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#d1d5db',
    borderTopStyle: 'solid',
    paddingTop: 8,
  },
  label: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 1,
  },
  value: {
    fontSize: 10,
    color: '#111827',
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

function formatDateTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function docTypeLabel(value) {
  if (value === 'boleta') return 'BOLETA DE VENTA ELECTRONICA';
  if (value === 'factura') return 'FACTURA ELECTRONICA';
  return 'COMPROBANTE DE VENTA';
}

function paymentMethodLabel(method) {
  const labels = {
    cash: 'Efectivo',
    yape: 'Yape',
    plin: 'Plin',
    transfer: 'Transferencia',
    card: 'Tarjeta',
  };
  return labels[method] || method || '-';
}

function buildItemsRows(details) {
  const safeDetails = Array.isArray(details) ? details : [];

  return safeDetails.map((detail, index) =>
    React.createElement(
      View,
      { key: `${detail.variant_id || 'item'}-${index}`, style: styles.tableRow },
      React.createElement(
        View,
        { style: styles.colDesc },
        React.createElement(Text, null, text(detail.style_name || detail.sku)),
        React.createElement(Text, { style: { fontSize: 8, color: '#9ca3af', marginTop: 1 } },
          `${text(detail.size_code, 'ST')} / ${text(detail.color_code, 'U')}`)
      ),
      React.createElement(Text, { style: styles.colQty }, text(detail.quantity, '0')),
      React.createElement(Text, { style: styles.colUnit }, amount(detail.unit_price_final)),
      React.createElement(Text, { style: styles.colTotal }, amount(detail.line_total))
    )
  );
}

function buildPaymentsRows(payments) {
  const safePayments = Array.isArray(payments) ? payments : [];
  if (safePayments.length === 0) return null;

  return React.createElement(
    View,
    { style: styles.payments },
    React.createElement(Text, { style: styles.sectionTitle }, 'Forma de pago'),
    ...safePayments.map((payment, index) =>
      React.createElement(
        View,
        { key: `payment-${index}`, style: styles.paymentRow },
        React.createElement(Text, null, paymentMethodLabel(payment.method)),
        React.createElement(Text, null, amount(payment.amount)),
        React.createElement(Text, { style: { color: '#9ca3af' } }, text(payment.reference, ''))
      )
    )
  );
}

function createReceiptDocument(sale) {
  const itemsRows = buildItemsRows(sale.details);
  const paymentsSection = buildPaymentsRows(sale.payments);
  const discountAmount = Number(sale.sale_discount_amount || 0);

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.companyName }, 'RIPNEL'),
        React.createElement(Text, { style: styles.docType }, docTypeLabel(sale.document_type)),
        React.createElement(Text, { style: styles.docNumber }, `Nro: ${text(sale.sale_number)}`)
      ),
      React.createElement(View, { style: styles.divider }),

      // Customer + Operation info (two columns)
      React.createElement(
        View,
        { style: styles.twoCol },
        React.createElement(
          View,
          { style: styles.col },
          React.createElement(Text, { style: styles.sectionTitle }, 'Cliente'),
          React.createElement(Text, { style: styles.value }, text(sale.customer_name_text)),
          React.createElement(Text, { style: styles.label },
            `${text(sale.customer_doc_type, '')}${sale.customer_doc_number ? ` ${text(sale.customer_doc_number)}` : ''}`),
          sale.customer_address_text
            ? React.createElement(Text, { style: { ...styles.label, marginTop: 2 } }, text(sale.customer_address_text))
            : null
        ),
        React.createElement(
          View,
          { style: styles.col },
          React.createElement(Text, { style: styles.sectionTitle }, 'Operacion'),
          React.createElement(Text, { style: styles.label }, `Fecha: ${formatDateTime(sale.confirmed_at || sale.created_at)}`),
          React.createElement(Text, { style: styles.label }, `Sede: ${text(sale.location_name)}`),
          React.createElement(Text, { style: styles.label }, `Vendedor: ${text(sale.seller_name)}`),
          React.createElement(Text, { style: styles.label }, `Moneda: ${text(sale.currency, 'PEN')}`)
        )
      ),

      // Items table
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(
          View,
          { style: styles.tableHeader },
          React.createElement(Text, { style: styles.colDesc }, 'Descripcion'),
          React.createElement(Text, { style: styles.colQty }, 'Cant.'),
          React.createElement(Text, { style: styles.colUnit }, 'P. Unit.'),
          React.createElement(Text, { style: styles.colTotal }, 'Importe')
        ),
        ...itemsRows
      ),

      // Totals
      React.createElement(
        View,
        { style: styles.totals },
        React.createElement(
          View,
          { style: styles.totalRow },
          React.createElement(Text, null, 'Subtotal'),
          React.createElement(Text, null, amount(sale.subtotal_amount))
        ),
        discountAmount > 0
          ? React.createElement(
            View,
            { style: styles.totalRow },
            React.createElement(Text, { style: { color: '#dc2626' } }, 'Descuento'),
            React.createElement(Text, { style: { color: '#dc2626' } }, `- ${amount(discountAmount)}`)
          )
          : null,
        React.createElement(
          View,
          { style: styles.totalRow },
          React.createElement(Text, null, 'IGV (18%)'),
          React.createElement(Text, null, amount(sale.tax_amount))
        ),
        React.createElement(View, { style: { ...styles.divider, marginTop: 4, marginBottom: 4 } }),
        React.createElement(
          View,
          { style: styles.totalRowBold },
          React.createElement(Text, { style: styles.totalLabelBold }, 'Importe total'),
          React.createElement(Text, { style: styles.totalValueBold }, amount(sale.total_amount))
        )
      ),

      // Payments
      paymentsSection,

      // Footer
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(Text, null, 'Comprobante generado electronicamente desde RIPNEL Plataforma.'),
        React.createElement(Text, { style: { marginTop: 2 } },
          'Conserve este documento para cualquier consulta o cambio.'),
        sale.notes
          ? React.createElement(Text, { style: { marginTop: 3, color: '#6b7280' } }, `Notas: ${sale.notes}`)
          : null
      )
    )
  );
}

async function renderReceiptSalePdfBuffer(sale) {
  const doc = createReceiptDocument(sale || {});
  return renderToBuffer(doc);
}

module.exports = {
  renderReceiptSalePdfBuffer,
};
