const TYPE_PREFIXES = {
  store: 'TD',
  warehouse: 'ALM',
  workshop: 'TLL',
  third_party: 'TER',
};

const IGNORED_WORDS = new Set([
  'TIENDA',
  'ALMACEN',
  'ALMACÉN',
  'TALLER',
  'TERCERO',
  'TERCEROS',
  'THIRD',
  'PARTY',
]);

function sanitizeText(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .trim()
    .toUpperCase();
}

function formatManualLocationCode(value) {
  return sanitizeText(value)
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20);
}

function buildLocationCodeBase(name, type) {
  const prefix = TYPE_PREFIXES[type] || 'LOC';
  const cleanedName = sanitizeText(name);

  const tokens = cleanedName
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !IGNORED_WORDS.has(token));

  const sourceTokens = tokens.length ? tokens : cleanedName.split(/\s+/).filter(Boolean);

  const suffix = sourceTokens
    .slice(0, 2)
    .map((token, index) => token.slice(0, index === 0 ? 4 : 3))
    .join('')
    .slice(0, 6);

  return suffix ? `${prefix}-${suffix}` : prefix;
}

function buildUniqueLocationCode(baseCode, existingCodes) {
  const normalizedBaseCode = formatManualLocationCode(baseCode) || 'LOC';

  if (!existingCodes.includes(normalizedBaseCode)) {
    return normalizedBaseCode;
  }

  let counter = 2;

  while (existingCodes.includes(`${normalizedBaseCode}-${counter}`)) {
    counter += 1;
  }

  return `${normalizedBaseCode}-${counter}`;
}

module.exports = {
  formatManualLocationCode,
  buildLocationCodeBase,
  buildUniqueLocationCode,
};
