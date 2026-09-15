const nodemailer = require('nodemailer');

const createTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass || user === 'your_email@gmail.com') {
    // Return mock transporter that logs emails to console for local testing
    return {
      sendMail: async (mailOptions) => {
        console.log('\n--- [EMAIL SIMULATOR / MOCK DISPATCH] ---');
        console.log(`To: ${mailOptions.to}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log(`Body (HTML):\n${mailOptions.html}\n------------------------------------------\n`);
        return { messageId: 'mock-email-id-' + Date.now() };
      }
    };
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: pass
    }
  });
};

module.exports = { createTransporter };
