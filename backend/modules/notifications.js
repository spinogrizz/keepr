const config = require('../config.js');
const nodemailer = require('nodemailer');
const axios = require('axios');

// Настройка транспорта электронной почты, если предоставлена конфигурация SMTP
let mailTransporter = null;
if (config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS) {
  mailTransporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465, // true для порта 465 (SSL), false для других (STARTTLS)
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS
    }
  });
}

// Отправка уведомления по электронной почте
async function sendEmail(to, subject, text) {
  if (!mailTransporter) {
    console.warn("Email transporter not configured. Skipping email.");
    return;
  }
  if (!to) {
    console.warn("No email recipient provided. Skipping email.");
    return;
  }
  try {
    await mailTransporter.sendMail({
      from: config.SMTP_USER,
      to: to,
      subject: subject,
      text: text
    });
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    console.error("Error sending email:", err);
  }
}

// Отправка уведомления в Telegram
async function sendTelegram(message) {
  if (!config.TELEGRAM_BOT_TOKEN || !config.TELEGRAM_CHAT_ID) {
    console.warn("Telegram config not provided. Skipping telegram message.");
    return;
  }
  try {
    const url = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/sendMessage`;
    await axios.post(url, {
      chat_id: config.TELEGRAM_CHAT_ID,
      text: message
    });
    console.log("Telegram message sent:", message);
  } catch (err) {
    console.error("Error sending Telegram message:", err);
  }
}

module.exports = {
  sendEmail,
  sendTelegram
};
