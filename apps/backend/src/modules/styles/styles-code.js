function sanitizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .trim()
    .toUpperCase();
}

function formatStyleCode(value, maxLength) {
  return sanitizeText(value)
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLength);
}

function buildStyleCodeBase({ garmentTypeCode, fabricCode, name, maxLength }) {
  const prefixParts = [garmentTypeCode, fabricCode].filter(Boolean).map((value) => sanitizeText(value));
  const cleanedName = sanitizeText(name);
  const tokens = cleanedName.split(/\s+/).filter(Boolean);
  const suffix = tokens
    .slice(0, 2)
    .map((token, index) => token.slice(0, index === 0 ? 4 : 3))
    .join('')
    .slice(0, 12);

  return formatStyleCode([...prefixParts, suffix].filter(Boolean).join('-'), maxLength);
}

function buildUniqueStyleCode(baseCode, existingCodes, maxLength) {
  const normalizedBaseCode = formatStyleCode(baseCode, maxLength);

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
  buildStyleCodeBase,
  buildUniqueStyleCode,
};
