import express from "express";
import {
  fetchAvailableDates,
  fetchAvailableSlots,
} from "../controllers/appointmentController.js";

const router = express.Router();

router.get("/available-dates", fetchAvailableDates);
router.get("/available", fetchAvailableSlots);

export default router;



