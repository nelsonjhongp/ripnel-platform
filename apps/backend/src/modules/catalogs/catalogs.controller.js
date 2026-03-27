const {
  createCatalogItem,
  listCatalogItems,
  updateCatalogItemById,
} = require('./catalogs.service');

function getCatalogItems(catalogKey) {
  return async function handleGetCatalogItems(req, res, next) {
    try {
      const items = await listCatalogItems(catalogKey);

      res.json({
        ok: true,
        data: items,
      });
    } catch (error) {
      next(error);
    }
  };
}

function postCatalogItem(catalogKey) {
  return async function handlePostCatalogItem(req, res, next) {
    try {
      const item = await createCatalogItem(catalogKey, req.body);

      res.status(201).json({
        ok: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  };
}

function patchCatalogItem(catalogKey) {
  return async function handlePatchCatalogItem(req, res, next) {
    try {
      const item = await updateCatalogItemById(catalogKey, req.params.id, req.body);

      res.json({
        ok: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  getCatalogItems,
  postCatalogItem,
  patchCatalogItem,
};
