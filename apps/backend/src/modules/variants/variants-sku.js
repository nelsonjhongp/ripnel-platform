function sanitizeSegment(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildVariantSku({ styleCode, sizeCode, colorCode }) {
  const normalizedStyleCode = sanitizeSegment(styleCode);
  const normalizedSizeCode = sanitizeSegment(sizeCode);
  const normalizedColorCode = sanitizeSegment(colorCode);

  return [normalizedStyleCode, normalizedSizeCode, normalizedColorCode]
    .filter(Boolean)
    .join('-')
    .slice(0, 60);
}

module.exports = {
  buildVariantSku,
};
