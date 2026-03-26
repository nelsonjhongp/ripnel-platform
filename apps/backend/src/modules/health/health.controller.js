const { query } = require('../../shared/db');

async function getHealth(req, res, next) {
  try {
    const result = await query('select now() as now');

    res.json({
      ok: true,
      dbTime: result.rows[0].now,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getHealth,
};
