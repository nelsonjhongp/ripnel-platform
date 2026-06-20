function round2(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

module.exports = { round2 };
