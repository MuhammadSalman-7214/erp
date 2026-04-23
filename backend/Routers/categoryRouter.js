const express = require("express");
const router = express.Router();
const validateRequest = require("../middleware/validateRequest");
const {
  categoryBody,
  categoryUpdateBody,
  idParam,
  queryParam,
} = require("../validation/schemas");
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
router.post(
  "/",
  authmiddleware,
  validateRequest({ body: categoryBody }),
  checkRole("admin", "manager"),
  createCategory,
);

// UPDATE category
router.put(
  "/:CategoryId",
  authmiddleware,
  validateRequest({ params: idParam("CategoryId"), body: categoryUpdateBody }),
  checkRole("admin", "manager"),
  updateCategory,
);

// DELETE category
router.delete(
  "/:CategoryId",
  authmiddleware,
  validateRequest({ params: idParam("CategoryId") }),
  checkRole("admin", "manager"),
  RemoveCategory,
);

// SEARCH category
router.get(
  "/search",
  authmiddleware,
  validateRequest({ query: queryParam() }),
  checkRole("admin", "manager"),
  Searchcategory,
);

module.exports = router;
