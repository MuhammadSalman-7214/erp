const express = require("express");
const Joi = require("joi");
const router = express.Router();
const validateRequest = require("../middleware/validateRequest");
const {
  authmiddleware,
  managermiddleware,
  checkPermission,
} = require("../middleware/Authmiddleware");
const { requireWarehouseAccess } = require("../libs/warehouseAccess");
const {
  idParam,
  warehouseBody,
  warehouseUpdateBody,
  locationBody,
  locationUpdateBody,
  warehouseAccessBody,
} = require("../validation/schemas");
const {
  createWarehouse,
  getWarehouses,
  updateWarehouse,
  deleteWarehouse,
  createLocation,
  getLocations,
  updateLocation,
  deleteLocation,
  assignWarehouseAccess,
  listWarehouseAccess,
  removeWarehouseAccess,
} = require("../controller/warehouseController");

const warehouseIdParam = idParam("warehouseId");
const warehouseAccessParam = Joi.object({
  warehouseId: Joi.number().integer().positive().required(),
  staffUserId: Joi.number().integer().positive().required(),
});

router.use(authmiddleware);

router.get("/", checkPermission("warehouse", "read"), getWarehouses);
router.post(
  "/",
  checkPermission("warehouse", "write"),
  managermiddleware,
  validateRequest({ body: warehouseBody }),
  createWarehouse,
);
router.put(
  "/:id",
  checkPermission("warehouse", "write"),
  managermiddleware,
  validateRequest({ params: idParam("id"), body: warehouseUpdateBody }),
  updateWarehouse,
);
router.delete(
  "/:id",
  checkPermission("warehouse", "delete"),
  managermiddleware,
  validateRequest({ params: idParam("id") }),
  deleteWarehouse,
);

router.get(
  "/:warehouseId/locations",
  checkPermission("warehouse", "read"),
  validateRequest({ params: warehouseIdParam }),
  requireWarehouseAccess((req) => req.params.warehouseId),
  getLocations,
);
router.post(
  "/:warehouseId/locations",
  checkPermission("warehouse", "write"),
  managermiddleware,
  validateRequest({ params: warehouseIdParam, body: locationBody }),
  createLocation,
);
router.put(
  "/locations/:id",
  checkPermission("warehouse", "write"),
  managermiddleware,
  validateRequest({ params: idParam("id"), body: locationUpdateBody }),
  updateLocation,
);
router.delete(
  "/locations/:id",
  checkPermission("warehouse", "delete"),
  managermiddleware,
  validateRequest({ params: idParam("id") }),
  deleteLocation,
);

router.get(
  "/:warehouseId/access",
  checkPermission("warehouse", "write"),
  managermiddleware,
  validateRequest({ params: warehouseIdParam }),
  listWarehouseAccess,
);
router.post(
  "/:warehouseId/access",
  checkPermission("warehouse", "write"),
  managermiddleware,
  validateRequest({ params: warehouseIdParam, body: warehouseAccessBody }),
  assignWarehouseAccess,
);
router.delete(
  "/:warehouseId/access/:staffUserId",
  checkPermission("warehouse", "write"),
  managermiddleware,
  validateRequest({ params: warehouseAccessParam }),
  removeWarehouseAccess,
);

module.exports = router;
