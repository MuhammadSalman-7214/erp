const express = require("express");
const router = express.Router();
const validateRequest = require("../middleware/validateRequest");
const {
  authSignupBody,
  authLoginBody,
  authForgotPasswordBody,
  authOtpBody,
  authResetPasswordBody,
  profileBody,
  idParam,
} = require("../validation/schemas");
const {
  signup,
  login,
  forgotPassword,
  resetPassword,
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

router.post("/signup", validateRequest({ body: authSignupBody }), signup);
router.post("/login", validateRequest({ body: authLoginBody }), login);
router.post(
  "/forgot-password",
  validateRequest({ body: authForgotPasswordBody }),
  forgotPassword,
);
router.post(
  "/reset-password",
  validateRequest({ body: authResetPasswordBody }),
  resetPassword,
);
router.post(
  "/verify-otp",
  validateRequest({ body: authOtpBody }),
  verifyLoginOtp,
);
router.get("/me", authmiddleware, getCurrentUser);
router.delete(
  "/removeuser/:UserId",
  validateRequest({ params: idParam("UserId") }),
  removeuser,
);
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
router.put(
  "/updateProfile",
  authmiddleware,
  validateRequest({ body: profileBody }),
  updateProfile,
);

module.exports = router;
