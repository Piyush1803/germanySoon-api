import express from "express";
import {
  createCheckoutSession,
  handleStripeWebhook,
} from "../controllers/paymentController.js";

const router = express.Router();

router.post("/create-checkout-session", createCheckoutSession);

// Stripe webhook requires raw body parser middleware
router.post("/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);

export default router;
