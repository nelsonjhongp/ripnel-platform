const express = require('express');
const { requireAuth, requirePermission } = require('../../middlewares/auth');
const {
  getCatalogItems,
  postCatalogItem,
  patchCatalogItem,
} = require('./catalogs.controller');

const router = express.Router();

router.get('/sizes', requireAuth, getCatalogItems('sizes'));
router.post('/sizes', requireAuth, requirePermission('catalogs.manage'), postCatalogItem('sizes'));
router.patch('/sizes/:id', requireAuth, requirePermission('catalogs.manage'), patchCatalogItem('sizes'));

router.get('/colors', requireAuth, getCatalogItems('colors'));
router.post('/colors', requireAuth, requirePermission('catalogs.manage'), postCatalogItem('colors'));
router.patch('/colors/:id', requireAuth, requirePermission('catalogs.manage'), patchCatalogItem('colors'));

router.get('/garment-types', requireAuth, getCatalogItems('garment-types'));
router.post('/garment-types', requireAuth, requirePermission('catalogs.manage'), postCatalogItem('garment-types'));
router.patch('/garment-types/:id', requireAuth, requirePermission('catalogs.manage'), patchCatalogItem('garment-types'));

router.get('/fabrics', requireAuth, getCatalogItems('fabrics'));
router.post('/fabrics', requireAuth, requirePermission('catalogs.manage'), postCatalogItem('fabrics'));
router.patch('/fabrics/:id', requireAuth, requirePermission('catalogs.manage'), patchCatalogItem('fabrics'));

router.get('/fabric-details', requireAuth, getCatalogItems('fabric-details'));
router.post('/fabric-details', requireAuth, requirePermission('catalogs.manage'), postCatalogItem('fabric-details'));
router.patch('/fabric-details/:id', requireAuth, requirePermission('catalogs.manage'), patchCatalogItem('fabric-details'));

router.get('/targets', requireAuth, getCatalogItems('targets'));
router.post('/targets', requireAuth, requirePermission('catalogs.manage'), postCatalogItem('targets'));
router.patch('/targets/:id', requireAuth, requirePermission('catalogs.manage'), patchCatalogItem('targets'));

module.exports = router;
