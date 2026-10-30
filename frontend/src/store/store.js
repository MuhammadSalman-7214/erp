import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/authSlice";
import productReducer from "../features/productSlice";
import categoryReducer from "../features/categorySlice";
import supplierReducer from "../features/SupplierSlice";
import activityReducer from "../features/activitySlice";
import orderReducer from "../features/orderSlice";
import notificationReducer from "../features/notificationSlice";
import stocktransactionReducer from "../features/stocktransactionSlice";
import salesReducer from "../features/salesSlice";
import customerReducer from "../features/customerSlice";
import dashboardReducer from "../features/dashboardSlice";
import sidebarReducer from "../features/sidebarSlice";
import warehouseReducer from "../features/warehouseSlice";
import receivingReducer from "../features/receivingSlice";
import fulfillmentReducer from "../features/fulfillmentSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    product: productReducer,
    category: categoryReducer,
    supplier: supplierReducer,
    activity: activityReducer,
    order: orderReducer,
    notification: notificationReducer,
    stocktransaction: stocktransactionReducer,
    sales: salesReducer,
    customer: customerReducer,
    dashboard: dashboardReducer,
    sidebar: sidebarReducer,
    warehouse: warehouseReducer,
    receiving: receivingReducer,
    fulfillment: fulfillmentReducer,
  },
});
export default store;
