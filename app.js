import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import cors from "cors";

dotenv.config();
const app = express();
app.use(cors());

// Raw body required *before* express.json() for Stripe webhook
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

app.use(bodyParser.json()); // Normal JSON parsing for other routes

// Routes
app.use("/api/appointments", appointmentRoutes);
app.use("/api/payments", paymentRoutes);

// Start server
app.listen(8080, () => {
  console.log("Server running on port 8080");
});
