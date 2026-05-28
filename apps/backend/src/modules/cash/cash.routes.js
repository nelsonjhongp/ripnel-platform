const express = require("express");
const {
  requireAuth,
  requireAnyPermission,
  requirePermission,
} = require("../../middlewares/auth");
const {
  getCashClosings,
  getCashCurrent,
  getCashClosingById,
  getCashAdminSummaryController,
  getCashAdminSessionsController,
  postOpenCash,
  patchCloseCash,
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
router.post("/open", requirePermission("cash.operate"), postOpenCash);
router.patch("/:id/close", requirePermission("cash.operate"), patchCloseCash);

module.exports = router;
