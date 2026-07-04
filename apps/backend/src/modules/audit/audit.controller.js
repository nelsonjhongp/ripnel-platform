const { getAuditTrail } = require('./audit.service');

async function getAuditLogs(req, res, next) {
  try {
    const {
      table,
      operation,
      actor,
      from,
      to,
      limit,
      offset,
    } = req.query || {};

    const data = await getAuditTrail({
      tableName: table,
      operation,
      actorUserId: actor,
      from,
      to,
      limit: limit ? Number(limit) : 100,
      offset: offset ? Number(offset) : 0,
    });

    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAuditLogs,
};