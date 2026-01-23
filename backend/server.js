const express = require("express");
const { MongoDBconfig } = require("./libs/mongoconfig.js");
const { Server } = require("socket.io");
const http = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const productrouter = require("./Routers/ProductRouter.js");
const authrouter = require("./Routers/authRouther.js");
const orderrouter = require("./Routers/orderRouter.js");
const categoryrouter = require("./Routers/categoryRouter.js");
const notificationrouter = require("./Routers/notificationRouters.js");
const activityrouter = require("./Routers/activityRouter.js");
const inventoryrouter = require("./Routers/inventoryRouter.js");
const salesrouter = require("./Routers/salesRouter.js");
const supplierrouter = require("./Routers/supplierrouter.js");
const invoiceRouter = require("./Routers/invoiceRouter.js");
const stocktransactionrouter = require("./Routers/stocktransactionrouter.js");

require("dotenv").config();
const PORT = process.env.PORT || 3003;
console.log("🚀 ~ PORT:", PORT);

const app = express();
const server = http.createServer(app);

const allowedOrigins = ["http://localhost:3000", "https://erp.dgexpense.com"];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like Postman, mobile apps)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

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
app.use("/api/auth", authrouter);
app.use("/api/product", productrouter);
app.use("/api/order", orderrouter);
app.use("/api/category", categoryrouter);
app.use("/api/notification", notificationrouter);
app.use("/api/activitylogs", activityrouter);
app.use("/api/inventory", inventoryrouter);
app.use("/api/sales", salesrouter);
app.use("/api/supplier", supplierrouter);
app.use("/api/stocktransaction", stocktransactionrouter);
app.use("/api/invoice", invoiceRouter);

server.listen(PORT, () => {
  MongoDBconfig();
  console.log(`The server is running at port ${PORT}`);
});

module.exports = { io, server };
