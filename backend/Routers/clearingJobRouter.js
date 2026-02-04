// Routers/clearingJobRouter.js - Complete Clearing Job Routes

const express = require("express");
const router = express.Router();
const {
  createClearingJob,
  getAllClearingJobs,
  getClearingJobById,
  updateClearingJob,
  updateClearingJobStatus,
  addClearingJobNote,
  assignAgentToClearingJob,
  getMyClearingJobs,
  deleteClearingJob,
  getClearingJobStatistics,
} = require("../controller/clearingJobController.js");
const {
  authmiddleware,
  checkRole,
  checkPermission,
} = require("../middleware/Authmiddleware.js");

// ==================== PUBLIC ROUTES (None - all require auth) ====================

// ==================== AUTHENTICATED ROUTES ====================

// Get all clearing jobs (with hierarchy filtering)
// Admins and staff see all in their scope, agents only see assigned jobs
router.get(
  "/",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin", "staff", "agent"),
  getAllClearingJobs,
);

// Get my clearing jobs (agent-specific endpoint)
router.get("/my-jobs", authmiddleware, checkRole("agent"), getMyClearingJobs);

// Get clearing job statistics
router.get(
  "/statistics",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin", "staff", "agent"),
  getClearingJobStatistics,
);

// Get clearing job by ID
router.get(
  "/:id",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin", "staff", "agent"),
  getClearingJobById,
);

// Create new clearing job
router.post(
  "/",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin", "staff"),
  checkPermission("clearingJob", "write"),
  createClearingJob,
);

// Update clearing job
// Agents have limited update permissions (handled in controller)
router.put(
  "/:id",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin", "staff", "agent"),
  updateClearingJob,
);

// Update clearing job status
// Agents can update status for their assigned jobs
router.patch(
  "/:id/status",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin", "staff", "agent"),
  updateClearingJobStatus,
);

// Add note to clearing job
// Agents can add notes to their assigned jobs
router.post(
  "/:id/note",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin", "staff", "agent"),
  addClearingJobNote,
);

// Assign agent to clearing job
// Only admins can assign agents
router.post(
  "/:id/assign-agent",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin"),
  assignAgentToClearingJob,
);

// Delete clearing job (soft delete)
// Only admins can delete
router.delete(
  "/:id",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin"),
  deleteClearingJob,
);

module.exports = router;
