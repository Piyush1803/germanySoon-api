import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "germanysoon0@gmail.com", // your Gmail
    pass: "nofi jhzf pubm yjvd"     // App password (not your Gmail password)
  }
});

export async function sendMeetingEmail({ to, subject, text }) {
  const mailOptions = {
    from: '"Deutschland Horizon" <germanysoon0@gmail.com>',
    to,
    subject,
    text
  };

  await transporter.sendMail(mailOptions);
}
