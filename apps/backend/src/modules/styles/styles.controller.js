const { createStyle, listStyles, patchStyle } = require('./styles.service');

async function getStyles(req, res, next) {
  try {
    const styles = await listStyles();

    res.json({
      ok: true,
      data: styles,
    });
  } catch (error) {
    next(error);
  }
}

async function postStyle(req, res, next) {
  try {
    const style = await createStyle(req.body);

    res.status(201).json({
      ok: true,
      data: style,
    });
  } catch (error) {
    next(error);
  }
}

async function patchStyleById(req, res, next) {
  try {
    const style = await patchStyle(req.params.styleId, req.body);

    res.json({
      ok: true,
      data: style,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStyles,
  postStyle,
  patchStyleById,
};
