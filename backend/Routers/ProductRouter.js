// Example: Routers/ProductRouter.js
const express = require("express");
const router = express.Router();
const {
  authmiddleware,
  checkPermission,
  checkRole,
} = require("../middleware/Authmiddleware.js");

const {
  createProduct,
  getProduct,
  RemoveProduct,
  EditProduct,
  getTopProductsByQuantity,
} = require("../controller/productController.js");
// Import your product controllers
// const { getProducts, createProduct, updateProduct, deleteProduct } = require('../controller/productController');

// GET - All roles (Admin, Manager can write; Staff read-only)
router.get("/", authmiddleware, checkPermission("product", "read"), getProduct);
router.get(
  "/getTopProductsByQuantity",
  authmiddleware,
  getTopProductsByQuantity,
);

// POST - Admin and Manager only
router.post(
  "/",
  authmiddleware,
  checkPermission("product", "write"),
  createProduct,
);

// PUT - Admin and Manager only
router.put(
  "/:id",
  authmiddleware,
  checkPermission("product", "write"),
  EditProduct,
);

// DELETE - Admin and Manager only
router.delete(
  "/:productId",
  authmiddleware,
  checkPermission("product", "delete"),
  RemoveProduct,
);

module.exports = router;
