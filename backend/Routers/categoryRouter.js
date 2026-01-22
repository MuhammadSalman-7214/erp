const express = require("express");
const router = express.Router();
const {
  authmiddleware,
  checkRole,
} = require("../middleware/Authmiddleware.js");

const {
  createCategory,
  getCategory,
  updateCategory,
  RemoveCategory,
  Searchcategory,
} = require("../controller/categorycontroller.js");

// GET all categories
router.get("/", authmiddleware, checkRole("admin", "manager"), getCategory);

// CREATE category
router.post("/", authmiddleware, checkRole("admin", "manager"), createCategory);

// UPDATE category
router.put(
  "/:CategoryId",
  authmiddleware,
  checkRole("admin", "manager"),
  updateCategory,
);

// DELETE category
router.delete(
  "/:CategoryId",
  authmiddleware,
  checkRole("admin", "manager"),
  RemoveCategory,
);

// SEARCH category
router.get(
  "/search",
  authmiddleware,
  checkRole("admin", "manager"),
  Searchcategory,
);

module.exports = router;
