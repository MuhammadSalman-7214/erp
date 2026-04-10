const express = require("express");
const db = require("./db");
const initDb = require("./libs/initDb");
const { Server } = require("socket.io");
const http = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const productrouter = require("./Routers/ProductRouter.js");
const authrouter = require("./Routers/authRouther.js");
const orderrouter = require("./Routers/orderRouter.js");
const categoryrouter = require("./Routers/categoryRouter.js");
// const notificationrouter = require("./Routers/notificationRouters.js");
const activityrouter = require("./Routers/activityRouter.js");
const inventoryrouter = require("./Routers/inventoryRouter.js");
const salesrouter = require("./Routers/salesRouter.js");
const supplierrouter = require("./Routers/supplierrouter.js");
const customerRouter = require("./Routers/customerRouter.js");
const invoiceRouter = require("./Routers/invoiceRouter.js");
const stocktransactionrouter = require("./Routers/stocktransactionrouter.js");
const paymentRouter = require("./Routers/paymentRouter.js");
const dashboardRouter = require("./Routers/dashboardRouter.js");
const priceListRouter = require("./Routers/priceListRouter.js");

require("dotenv").config();
const PORT = process.env.PORT;
console.log("🚀 ~ PORT:", PORT);

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:3000",
  "https://imrantraders.shop",
  "https://www.imrantraders.shop",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true); // allowed
      } else {
        return callback(null, false);
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  }),
);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

app.use(express.json({ limit: "10mb" }));
app.use(express.json());
app.set("io", io);
app.use(cookieParser());
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});
app.use("/api/auth", authrouter);
app.use("/api/product", productrouter);
app.use("/api/order", orderrouter);
app.use("/api/category", categoryrouter);
// app.use("/api/notification", notificationrouter);
app.use("/api/activitylogs", activityrouter);
app.use("/api/inventory", inventoryrouter);
app.use("/api/sales", salesrouter);
app.use("/api/supplier", supplierrouter);
app.use("/api/customer", customerRouter);
app.use("/api/stocktransaction", stocktransactionrouter);
app.use("/api/invoice", invoiceRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/price-list", priceListRouter);

server.listen(PORT, () => {
  initDb()
    .then(() => console.log("Database tables ensured"))
    .catch((err) => console.error("Database init error:", err));
  console.log(`The server is running at port ${PORT}`);
});

module.exports = { io, server };
