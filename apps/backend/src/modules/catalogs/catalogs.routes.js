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

router.get('/fabrics', getCatalogItems('fabrics'));
router.post('/fabrics', postCatalogItem('fabrics'));
router.patch('/fabrics/:id', patchCatalogItem('fabrics'));

router.get('/fabric-details', getCatalogItems('fabric-details'));
router.post('/fabric-details', postCatalogItem('fabric-details'));
router.patch('/fabric-details/:id', patchCatalogItem('fabric-details'));

router.get('/targets', getCatalogItems('targets'));
router.post('/targets', postCatalogItem('targets'));
router.patch('/targets/:id', patchCatalogItem('targets'));

module.exports = router;
