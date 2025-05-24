import { google } from "googleapis";
import path from "path";
import { fileURLToPath } from "url";
import { sendMeetingEmail } from "./mailService.js";




// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load service account credentials
const keyPath = path.join(__dirname, "../config/google-service-account.json");

const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  

// Initialize Calendar API
const calendar = google.calendar({ version: "v3", auth });

// Google Calendar ID
const calendarId = "germanysoon0@gmail.com"; 
// Or your custom calendar ID like: "your_calendar_id@group.calendar.google.com"

// Function to create an event
export async function createGoogleCalendarEvent(appointment) {
  const startTime = new Date(appointment.start_time);
  const endTime = new Date(appointment.end_time);
  const event = {
    summary: `Appointment with ${appointment.name}`,
    description: `Email: ${appointment.email}`,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: "Asia/Kolkata",
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: "Asia/Kolkata",
    },
  };

  const response = await calendar.events.insert({
    calendarId,
    resource: event,
    conferenceDataVersion: 1,
  });

  await sendMeetingEmail({
    to: appointment.email,
    subject: "Your appointment is confirmed",
    text: `
      Hi ${appointment.name},
  
      Your appointment is confirmed with the following details:
  
      Start Time: ${appointment.start_time}
      End Time: ${appointment.end_time}
  
      Thank you!
    `,
  });

  
  await sendMeetingEmail({
    to: "germanysoon0@gmail.com", // Replace with your admin email
    subject: `New Appointment Booked by ${appointment.name}`,
    text: `
      A new appointment has been booked:
  
      Name: ${appointment.name}
      Email: ${appointment.email}
      Start Time: ${appointment.start_time}
      End Time: ${appointment.end_time}
    `,
  });
  

  return response.data;
}
