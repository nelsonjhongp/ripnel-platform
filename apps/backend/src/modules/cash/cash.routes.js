const express = require("express");
const {
  requireAuth,
  requireAnyPermission,
  requirePermission,
} = require("../../middlewares/auth");
const { validate } = require("../../middlewares/validate");
const { openCash, closeCash, reopenCash } = require("../../shared/schemas");
const {
  getCashClosings,
  getCashCurrent,
  getCashClosingById,
  getCashAdminSummaryController,
  getCashAdminSessionsController,
  postOpenCash,
  patchCloseCash,
  patchReopenCash,
} = require("./cash.controller");

const router = express.Router();

router.use(requireAuth);

router.get(
  "/admin/summary",
  requirePermission("cash.admin.view"),
  getCashAdminSummaryController,
);
router.get(
  "/admin/sessions",
  requirePermission("cash.admin.view"),
  getCashAdminSessionsController,
);
router.get(
  "/",
  requireAnyPermission(["cash.view", "cash.operate"]),
  getCashClosings,
);
router.get(
  "/current",
  requireAnyPermission(["cash.view", "cash.operate"]),
  getCashCurrent,
);
router.get(
  "/:id",
  requireAnyPermission(["cash.view", "cash.operate"]),
  getCashClosingById,
);
router.post("/open", requirePermission("cash.operate"), validate(openCash), postOpenCash);
router.patch("/:id/close", requirePermission("cash.operate"), validate(closeCash), patchCloseCash);
router.patch("/:id/reopen", requirePermission("cash.admin.reopen"), validate(reopenCash), patchReopenCash);

module.exports = router;
