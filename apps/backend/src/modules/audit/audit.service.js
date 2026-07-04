const { listAuditLogs, countAuditLogs } = require('./audit.repo');

async function getAuditTrail(filters = {}) {
  const [rows, total] = await Promise.all([
    listAuditLogs(filters),
    countAuditLogs(filters),
  ]);

  return {
    rows,
    total,
    limit: filters.limit || 100,
    offset: filters.offset || 0,
  };
}

module.exports = {
  getAuditTrail,
};