const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
  quiet: true,
});

const REQUIRED_VARS = [
  ['DATABASE_URL', 'Database connection string'],
  ['JWT_SECRET', 'JWT signing secret'],
];

function validateEnv() {
  const missing = [];

  for (const [varName, description] of REQUIRED_VARS) {
    if (!process.env[varName]) {
      missing.push(`  ${varName}: ${description} is required`);
    }
  }

  if (missing.length > 0) {
    const errorMessage = [
      'Missing required environment variables:',
      ...missing,
      '',
      'Create or update your .env file with these values.',
    ].join('\n');

    console.error(errorMessage);
    process.exit(1);
  }
}

validateEnv();

const env = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  sessionCookieDomain: process.env.SESSION_COOKIE_DOMAIN || '',
  apiSunatBaseUrl: process.env.APISUNAT_BASE_URL || '',
  apiSunatIssuePath:
    process.env.APISUNAT_ISSUE_PATH || '/personas/v1/sendBill',
  apiSunatGetByIdPath:
    process.env.APISUNAT_GET_BY_ID_PATH || '/documents/:documentId/getById',
  apiSunatToken: process.env.APISUNAT_TOKEN || '',
  apiSunatEnabled: !['0', 'false', 'no', 'off'].includes(
    String(process.env.APISUNAT_ENABLED || 'true').toLowerCase()
  ),
  apiSunatTimeoutMs: Number(process.env.APISUNAT_TIMEOUT_MS) || 15000,
  apiSunatRetryJobEnabled: !['0', 'false', 'no', 'off'].includes(
    String(process.env.APISUNAT_RETRY_JOB_ENABLED || 'true').toLowerCase()
  ),
  apiSunatRetryIntervalMs: Number(process.env.APISUNAT_RETRY_INTERVAL_MS) || 300000,
  apiSunatRetryBatchSize: Number(process.env.APISUNAT_RETRY_BATCH_SIZE) || 20,
  apiSunatPersonaId: process.env.APISUNAT_PERSONA_ID || '',
  apiSunatPersonaToken: process.env.APISUNAT_PERSONA_TOKEN || '',
  apiSunatIssuerDocument: process.env.APISUNAT_ISSUER_DOCUMENT || '',
  apiSunatIssuerBusinessName: process.env.APISUNAT_ISSUER_BUSINESS_NAME || '',
  apiSunatIssuerCommercialName: process.env.APISUNAT_ISSUER_COMMERCIAL_NAME || '',
  apiSunatIssuerUbigeo: process.env.APISUNAT_ISSUER_UBIGEO || '',
  apiSunatIssuerDepartment: process.env.APISUNAT_ISSUER_DEPARTMENT || '',
  apiSunatIssuerProvince: process.env.APISUNAT_ISSUER_PROVINCE || '',
  apiSunatIssuerDistrict: process.env.APISUNAT_ISSUER_DISTRICT || '',
  apiSunatIssuerUrbanization: process.env.APISUNAT_ISSUER_URBANIZATION || '',
  apiSunatIssuerAddress: process.env.APISUNAT_ISSUER_ADDRESS || '',
  apiSunatIssuerLocalCode: process.env.APISUNAT_ISSUER_LOCAL_CODE || '',
  apiSunatGetPdfPath:
    process.env.APISUNAT_GET_PDF_PATH ||
    '/documents/:documentId/getPDF/:format/:fileName.pdf',
  apiSunatPdfFormat: process.env.APISUNAT_PDF_FORMAT || 'A4',
  apiSunatIssueFileNameTemplate:
    process.env.APISUNAT_ISSUE_FILENAME_TEMPLATE ||
    ':issuerDocument-:documentCode-:series-:correlative',
  apiSunatPdfFileNameTemplate:
    process.env.APISUNAT_PDF_FILENAME_TEMPLATE || ':series-:correlative',
};

module.exports = {
  env,
};
