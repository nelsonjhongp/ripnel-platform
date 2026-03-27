const {
  getStyleVariants,
  updateStyleConfig,
  generateStyleVariants,
  patchVariant,
} = require('./variants.service');

async function getStyleVariantsConfig(req, res, next) {
  try {
    const payload = await getStyleVariants(req.params.styleId);

    res.json({
      ok: true,
      data: payload,
    });
  } catch (error) {
    next(error);
  }
}

async function putStyleVariantsConfig(req, res, next) {
  try {
    const payload = await updateStyleConfig(req.params.styleId, req.body);

    res.json({
      ok: true,
      data: payload,
    });
  } catch (error) {
    next(error);
  }
}

async function postGenerateStyleVariants(req, res, next) {
  try {
    const payload = await generateStyleVariants(req.params.styleId);

    res.status(201).json({
      ok: true,
      data: payload,
    });
  } catch (error) {
    next(error);
  }
}

async function patchVariantById(req, res, next) {
  try {
    const payload = await patchVariant(req.params.variantId, req.body);

    res.json({
      ok: true,
      data: payload,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStyleVariantsConfig,
  putStyleVariantsConfig,
  postGenerateStyleVariants,
  patchVariantById,
};
