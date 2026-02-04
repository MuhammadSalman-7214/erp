// Routers/authRouter.js - UPDATED WITH NEW ENDPOINTS

const express = require("express");
const router = express.Router();
const {
  signup,
  login,
  updateProfile,
  logout,
  staffuser,
  manageruser,
  adminuser,
  branchadminuser,
  countryadminuser,
  superadminuser,
  agentuser,
  getAllUsers,
  getUsersByBranch,
  getUsersByCountry,
  getUserStats,
  removeuser,
  toggleUserStatus,
  setupInitialAdmin,
  checkSetup,
} = require("../controller/authcontroller.js");
const {
  authmiddleware,
  checkRole,
} = require("../middleware/Authmiddleware.js");

// ==================== PUBLIC ROUTES ====================
router.post(
  "/signup",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin"),
  signup,
);

router.get("/check-setup", checkSetup);
// authRouter.js - Add route
router.post("/setup-admin", setupInitialAdmin);
router.post("/login", login);

// ==================== AUTHENTICATED ROUTES ====================
router.post("/logout", authmiddleware, logout);
router.put("/updateProfile", authmiddleware, updateProfile);

// ==================== GET USERS BY ROLE (LEGACY - for backward compatibility) ====================
router.get("/staffuser", authmiddleware, staffuser);
router.get("/manageruser", authmiddleware, manageruser); // Maps to branchadmin
router.get("/adminuser", authmiddleware, adminuser); // Maps to countryadmin

// ==================== GET USERS BY ROLE (NEW HIERARCHY) ====================
router.get(
  "/branchadminuser",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin"),
  branchadminuser,
);

router.get(
  "/countryadminuser",
  authmiddleware,
  checkRole("superadmin"),
  countryadminuser,
);

router.get(
  "/superadminuser",
  authmiddleware,
  checkRole("superadmin"),
  superadminuser,
);

router.get(
  "/agentuser",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin"),
  agentuser,
);

// ==================== ADVANCED USER QUERIES ====================
router.get(
  "/users",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin"),
  getAllUsers,
);

router.get(
  "/users/branch/:branchId",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin"),
  getUsersByBranch,
);

router.get(
  "/users/country/:countryId",
  authmiddleware,
  checkRole("superadmin", "countryadmin"),
  getUsersByCountry,
);

router.get(
  "/users/stats",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin"),
  getUserStats,
);

// ==================== USER MANAGEMENT ====================
router.delete(
  "/removeuser/:UserId",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin"),
  removeuser,
);

router.patch(
  "/toggleUserStatus/:userId",
  authmiddleware,
  checkRole("superadmin", "countryadmin", "branchadmin"),
  toggleUserStatus,
);

module.exports = router;
