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
  addClearingJobDocument,
  addClearingJobExpense,
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
  checkPermission("clearingJob", "read"),
  getAllClearingJobs,
);

// Get my clearing jobs (agent-specific endpoint)
router.get("/my-jobs", authmiddleware, checkRole("agent"), getMyClearingJobs);

// Get clearing job statistics
router.get(
  "/statistics",
  authmiddleware,
  checkPermission("clearingJob", "read"),
  getClearingJobStatistics,
);

// Get clearing job by ID
router.get(
  "/:id",
  authmiddleware,
  checkPermission("clearingJob", "read"),
  getClearingJobById,
);

// Create new clearing job
router.post(
  "/",
  authmiddleware,
  checkPermission("clearingJob", "write"),
  createClearingJob,
);

// Update clearing job
// Agents have limited update permissions (handled in controller)
router.put(
  "/:id",
  authmiddleware,
  checkPermission("clearingJob", "write"),
  updateClearingJob,
);

// Update clearing job status
// Agents can update status for their assigned jobs
router.patch(
  "/:id/status",
  authmiddleware,
  checkPermission("clearingJob", "write"),
  updateClearingJobStatus,
);

// Add note to clearing job
// Agents can add notes to their assigned jobs
router.post(
  "/:id/note",
  authmiddleware,
  checkPermission("clearingJob", "write"),
  addClearingJobNote,
);

// Add document to clearing job
router.post(
  "/:id/document",
  authmiddleware,
  checkPermission("clearingJob", "write"),
  addClearingJobDocument,
);

// Add expense to clearing job
router.post(
  "/:id/expense",
  authmiddleware,
  checkPermission("clearingJob", "write"),
  addClearingJobExpense,
);

// Assign agent to clearing job
// Only admins can assign agents
router.post(
  "/:id/assign-agent",
  authmiddleware,
  checkPermission("clearingJob", "write"),
  assignAgentToClearingJob,
);

// Delete clearing job (soft delete)
// Only admins can delete
router.delete(
  "/:id",
  authmiddleware,
  checkPermission("clearingJob", "delete"),
  deleteClearingJob,
);

module.exports = router;
