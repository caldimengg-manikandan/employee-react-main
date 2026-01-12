const nodemailer = require("nodemailer");

async function sendZohoMail({ to, subject, content, html }) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.zoho.com",
      port: process.env.EMAIL_PORT || 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER, // sender address
      to: to, // list of receivers
      subject: subject, // Subject line
      text: content, // plain text body
      html: html || content, // html body
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Message sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending Zoho mail:", error);
    throw error;
  }
}

module.exports = { sendZohoMail };
