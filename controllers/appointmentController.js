import {
  getAvailableDates,
  getAvailableSlots,
} from "../models/appointmentModel.js";

// GET /api/appointments/available-dates
export const fetchAvailableDates = (req, res) => {
  getAvailableDates((err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    const dates = results.map(row => row.date);
    res.json(dates);
  });
};

// GET /api/appointments/available?date=YYYY-MM-DD
export const fetchAvailableSlots = (req, res) => {
  const { date } = req.query;
  getAvailableSlots(date, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
};
