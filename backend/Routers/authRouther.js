const express = require("express");
const router = express.Router();
const {
  signup,
  login,
  verifyLoginOtp,
  updateProfile,
  logout,
  staffuser,
  manageruser,
  adminuser,
  removeuser,
  superadminAdmins,
  toggleAdminStatus,
  getCurrentUser,
} = require("../controller/authcontroller.js");
const {
  authmiddleware,
  adminmiddleware,
  managermiddleware,
  superadminmiddleware,
} = require("../middleware/Authmiddleware.js");

router.post("/signup", signup);
router.post("/login", login);
router.post("/verify-otp", verifyLoginOtp);
router.get("/me", authmiddleware, getCurrentUser);
router.delete("/removeuser/:UserId", removeuser);
router.get("/staffuser", authmiddleware, staffuser);
router.get("/manageruser", authmiddleware, manageruser);
router.get("/adminuser", authmiddleware, adminuser);
router.get(
  "/super-admin/admins",
  authmiddleware,
  superadminmiddleware,
  superadminAdmins,
);
router.patch(
  "/super-admin/admins/:id/toggle",
  authmiddleware,
  superadminmiddleware,
  toggleAdminStatus,
);
router.post("/logout", authmiddleware, logout);
router.put("/updateProfile", authmiddleware, updateProfile);

module.exports = router;
