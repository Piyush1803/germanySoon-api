import Stripe from "stripe";
import {
  bookAppointment,
  getAppointmentById,
} from "../models/appointmentModel.js";
import { sendMeetingEmail } from "../services/mailService.js";
import { createGoogleCalendarEvent } from "../services/googleCalendarService.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create checkout session with metadata containing slotId, name, email
export const createCheckoutSession = async (req, res) => {
  const { name, email, slotId } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: "Appointment Booking",
          },
          unit_amount: 500, // $5
        },
        quantity: 1,
      }],
      mode: "payment",
      customer_email: email,
      success_url: `http://localhost:5173/success?payment=success`,
      cancel_url: `http://localhost:5173/cancel`,
      metadata: { name, email, slotId },  // important metadata here
    });


    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: "Stripe session failed" });
  }
};

// Webhook to handle successful payments & book appointments ONLY here
export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }


  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { name, email, slotId } = session.metadata;

    // Book the appointment only after payment success
    bookAppointment({ id: slotId, name, email }, (err, result) => {
      if (err) {
        console.error("Database error during booking:", err);
        return;
      }
      if (result.affectedRows === 0) {
        console.warn("Slot already booked or not found:", slotId);
        return;
      }

      // Fetch appointment details to create calendar event and send email
      getAppointmentById(slotId, async (err, rows) => {
        if (err || !rows.length) {
          console.error("Failed to fetch appointment details:", err);
          return;
        }

        const appointment = rows[0];

        try {
          const calendarEvent = await createGoogleCalendarEvent(appointment);

          const meetLink = calendarEvent.conferenceData?.entryPoints?.find(
            (e) => e.entryPointType === "video"
          )?.uri;

          await sendMeetingEmail({
            to: email,
            subject: "Your Appointment Confirmation",
            text: `Your appointment is confirmed for ${new Date(
              appointment.start_time
            ).toLocaleString()}. 
            Google Meet: ${meetLink || "Link not available"}`,
          });

          console.log("✅ Payment & booking completed for", name);
        } catch (error) {
          console.error("Failed to send email or create calendar event:", error);
        }
      });
    });
  }

  res.status(200).json({ received: true });
};
