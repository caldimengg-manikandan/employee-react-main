const nodemailer = require("nodemailer");

async function sendZohoMail({ to, cc, subject, content, html, attachments }) {
  try {
    const host = process.env.SMTP_HOST || process.env.EMAIL_HOST || "smtp.zoho.com";
    const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 465;
    const secure = port === 465;
    const user = process.env.SMTP_USER || process.env.EMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
    const from = process.env.SMTP_FROM || user;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    console.log("Sending mail with options:", {
      from,
      to,
      subject,
      attachmentCount: attachments ? attachments.length : 0
    });

    const mailOptions = {
      from: from, // sender address
      to: to, // list of receivers
      cc: cc, // CC receivers
      subject: subject, // Subject line
      text: content, // plain text body
      html: html || content, // html body
      attachments: attachments, // Attachments array
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
