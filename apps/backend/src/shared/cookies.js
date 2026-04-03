function parseCookies(cookieHeader) {
  const header = cookieHeader || '';
  const out = {};

  header.split(';').forEach((part) => {
    const trimmed = part.trim();
    if (!trimmed) return;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) return;
    const key = trimmed.slice(0, eqIndex).trim();
    const val = trimmed.slice(eqIndex + 1).trim();
    if (!key) return;
    out[key] = decodeURIComponent(val);
  });

  return out;
}

module.exports = {
  parseCookies,
};

