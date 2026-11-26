
const { Resend } = require("resend");

class EmailService {
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendEmail(to, subject, html) {
    const { data, error } = await this.resend.emails.send({
      from: process.env.EMAIL_FROM || "Lab Agenda <onboarding@resend.dev>",
      to,
      subject,
      html,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}

module.exports = EmailService;
