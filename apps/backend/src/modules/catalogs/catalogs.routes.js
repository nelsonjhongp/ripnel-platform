const express = require('express');
const {
  getCatalogItems,
  postCatalogItem,
  patchCatalogItem,
} = require('./catalogs.controller');

const router = express.Router();

router.get('/sizes', getCatalogItems('sizes'));
router.post('/sizes', postCatalogItem('sizes'));
router.patch('/sizes/:id', patchCatalogItem('sizes'));

router.get('/colors', getCatalogItems('colors'));
router.post('/colors', postCatalogItem('colors'));
router.patch('/colors/:id', patchCatalogItem('colors'));

router.get('/garment-types', getCatalogItems('garment-types'));
router.post('/garment-types', postCatalogItem('garment-types'));
router.patch('/garment-types/:id', patchCatalogItem('garment-types'));

module.exports = router;
