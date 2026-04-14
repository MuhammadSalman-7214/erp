const nodemailer = require("nodemailer");

const getMailer = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const host = process.env.EMAIL_HOST || "smtp.hostinger.com";
  const port = Number(process.env.EMAIL_PORT || 465);
  const secure =
    process.env.EMAIL_SECURE === "false" ? false : port === 465;

  if (!user || !pass) {
    throw new Error("EMAIL_USER and EMAIL_PASS must be set");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
};

const sendMail = async ({ to, subject, text, html }) => {
  const transporter = getMailer();

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
      html,
    });

    console.log(`Email sent successfully to ${to} with subject: ${subject}`);
    return info;
  } catch (error) {
    console.error(`Email sending failed for ${to} with subject: ${subject}`, error);
    throw error;
  }
};

module.exports = {
  sendMail,
};
