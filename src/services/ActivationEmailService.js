const crypto = require("crypto");
const EmailService = require("./EmailService");

class ActivationEmailService {
  constructor() {
    this.emailService = new EmailService();
  }

  generateActivationToken() {
    const token = crypto.randomBytes(32).toString("hex");

    const tokenHash = this.hashActivationToken(token);

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    return {
      token,
      tokenHash,
      expiresAt,
    };
  }

  hashActivationToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]);
  }

  async sendActivationEmail(email, name, token) {
    const activationLink = `${process.env.FRONTEND_URL}/activate-account?token=${encodeURIComponent(token)}`;
    const safeName = this.escapeHtml(name);

    await this.emailService.sendEmail(
      email,
      "Activate your account - Lab Agenda",
      `
        <h2>Welcome to Lab Agenda!</h2>
        <p>Hello, ${safeName}.</p>
        <p>Your account has been registered.</p>
        <p>Click below to create your password:</p>
        <a href="${activationLink}">Activate my account</a>
        <p>This link expires in 24 hours.</p>
      `,
    );
  }
}

module.exports = ActivationEmailService;
