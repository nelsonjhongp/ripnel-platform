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
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || '',
};

module.exports = {
  env,
};
