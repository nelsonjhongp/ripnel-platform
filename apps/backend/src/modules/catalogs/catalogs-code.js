function sanitizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .trim()
    .toUpperCase();
}

function formatManualCatalogCode(value, maxLength) {
  return sanitizeText(value)
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLength);
}

function buildCatalogCodeBase(name, maxLength) {
  const cleanedName = sanitizeText(name);
  const tokens = cleanedName.split(/\s+/).filter(Boolean);

  if (!tokens.length) {
    return '';
  }

  const suffix = tokens
    .slice(0, 2)
    .map((token, index) => token.slice(0, index === 0 ? 4 : 3))
    .join('')
    .slice(0, maxLength);

  return suffix || tokens[0].slice(0, maxLength);
}

function buildUniqueCatalogCode(baseCode, existingCodes, maxLength) {
  const normalizedBaseCode = formatManualCatalogCode(baseCode, maxLength);

  if (!normalizedBaseCode) {
    return '';
  }

  if (!existingCodes.includes(normalizedBaseCode)) {
    return normalizedBaseCode;
  }

  let counter = 2;

  while (true) {
    const suffix = `-${counter}`;
    const candidate = `${normalizedBaseCode.slice(0, maxLength - suffix.length)}${suffix}`;

    if (!existingCodes.includes(candidate)) {
      return candidate;
    }

    counter += 1;
  }
}

module.exports = {
  sanitizeText,
  formatManualCatalogCode,
  buildCatalogCodeBase,
  buildUniqueCatalogCode,
};
