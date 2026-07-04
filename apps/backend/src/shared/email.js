const nodemailer = require('nodemailer');
const { env } = require('../config/env');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
      const err = new Error('SMTP no configurado');
    err.statusCode = 500;
    err.code = 'SMTP_CONFIG_ERROR';
    throw err;
    }
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: { user: env.smtpUser, pass: env.smtpPass },
    });
  }
  return transporter;
}

async function sendReceiptEmail({ to, subject, text, pdfBuffer, pdfFilename }) {
  const transport = getTransporter();
  const mailOptions = {
    from: env.smtpFrom || env.smtpUser,
    to,
    subject: subject || 'Comprobante de venta - RIPNEL',
    text: text || 'Adjuntamos el comprobante de su venta.',
    attachments: pdfBuffer
      ? [{ filename: pdfFilename || 'comprobante.pdf', content: pdfBuffer }]
      : [],
  };
  await transport.sendMail(mailOptions);
}

async function sendWelcomeEmail({ to, username, temporaryPassword }) {
  const transport = getTransporter();
  const mailOptions = {
    from: env.smtpFrom || env.smtpUser,
    to,
    subject: 'Bienvenido a RIPNEL - Credenciales de acceso',
    text: [
      'Hola,',
      '',
      'Tu cuenta en RIPNEL ha sido creada.',
      '',
      `Usuario: ${username}`,
      `Clave temporal: ${temporaryPassword}`,
      '',
      'Al ingresar por primera vez, deberas cambiar tu clave.',
    ].join('\n'),
  };
  await transport.sendMail(mailOptions);
}

module.exports = { sendReceiptEmail, sendWelcomeEmail };
