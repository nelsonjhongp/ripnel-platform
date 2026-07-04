const express = require('express');
const { requireAuth, requirePermission } = require('../../middlewares/auth');
const { getAuditLogs } = require('./audit.controller');

const router = express.Router();

router.get('/', requireAuth, requirePermission('admin.manage'), getAuditLogs);

module.exports = router;