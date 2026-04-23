// Example: Routers/ProductRouter.js
const express = require("express");
const router = express.Router();
const validateRequest = require("../middleware/validateRequest");
const {
  productBody,
  productUpdateBody,
  productCodeCreateBody,
  productCodeUpdateBody,
  idParam,
  queryParam,
} = require("../validation/schemas");
const {
  authmiddleware,
  checkPermission,
  checkRole,
} = require("../middleware/Authmiddleware.js");

const {
  Addproduct,
  getProduct,
  RemoveProduct,
  EditProduct,
  getTopProductsByQuantity,
  SearchProduct,
  getProductCodesByProduct,
  addProductCode,
  updateProductCode,
  deleteProductCode,
} = require("../controller/productController.js");
// Import your product controllers
// const { getProducts, createProduct, updateProduct, deleteProduct } = require('../controller/productController');

// GET - All roles (Admin, Manager can write; Staff read-only)
router.get(
  "/searchproduct",
  authmiddleware,
  validateRequest({ query: queryParam() }),
  checkPermission("product", "read"),
  SearchProduct,
);
router.get("/", authmiddleware, checkPermission("product", "read"), getProduct);
router.get(
  "/:productId/codes",
  authmiddleware,
  validateRequest({ params: idParam("productId") }),
  checkPermission("product", "read"),
  getProductCodesByProduct,
);
router.get(
  "/getTopProductsByQuantity",
  authmiddleware,
  getTopProductsByQuantity,
);

// POST - Admin and Manager only
router.post(
  "/",
  authmiddleware,
  validateRequest({ body: productBody }),
  checkPermission("product", "write"),
  Addproduct,
);
router.post(
  "/:productId/codes",
  authmiddleware,
  validateRequest({ params: idParam("productId"), body: productCodeCreateBody }),
  checkPermission("product", "write"),
  addProductCode,
);

// PUT - Admin and Manager only
router.put(
  "/:id",
  authmiddleware,
  validateRequest({ params: idParam("id"), body: productUpdateBody }),
  checkPermission("product", "write"),
  EditProduct,
);
router.put(
  "/code/:codeId",
  authmiddleware,
  validateRequest({ params: idParam("codeId"), body: productCodeUpdateBody }),
  checkPermission("product", "write"),
  updateProductCode,
);

// DELETE - Admin and Manager only
router.delete(
  "/:productId",
  authmiddleware,
  validateRequest({ params: idParam("productId") }),
  checkRole("admin", "manager"),
  RemoveProduct,
);
router.delete(
  "/code/:codeId",
  authmiddleware,
  validateRequest({ params: idParam("codeId") }),
  checkRole("admin", "manager"),
  deleteProductCode,
);

module.exports = router;
