const database = require("../database/Database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const ActivationEmailService = require("../services/ActivationEmailService");

class UserController {
  constructor() {
    this.database = database;
    this.activationEmailService = new ActivationEmailService();
  }

  checkAdmin(role) {
    if (role !== "admin") {
      const error = new Error(
        "Somente administradores podem realizar esta ação.",
      );
      error.statusCode = 403;
      throw error;
    }
  }

  async login(email, password) {
    const [users] = await this.database.execute(
      `SELECT id, name, email, registration_number, password_hash, role, is_active
       FROM pessoas
       WHERE email = ?
       LIMIT 1`,
      [email],
    );

    if (users.length === 0 || Number(users[0].is_active) !== 1) {
      const error = new Error("Email ou senha inválidos.");
      error.statusCode = 401;
      throw error;
    }

    const user = users[0];

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      const error = new Error("Email ou senha inválidos.");
      error.statusCode = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      },
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        registration_number: user.registration_number,
        role: user.role,
      },
    };
  }

  async createUser(name, email, registration_number) {
    const { token, tokenHash, expiresAt } =
      this.activationEmailService.generateActivationToken();

    const [result] = await this.database.execute(
      `INSERT INTO pessoas
       (name, email, registration_number, role, activation_token_hash, activation_expires_at)
       VALUES (?, ?, ?, 'teacher', ?, ?)`,
      [name, email, registration_number, tokenHash, expiresAt],
    );

    await this.activationEmailService.sendActivationEmail(email, name, token);

    return result;
  }

  readUser(role) {
    this.checkAdmin(role);

    return this.database.execute(
      `SELECT id, name, email, registration_number, role, is_active
     FROM pessoas`,
    );
  }

  async activateUser(token, password) {
    const tokenHash = this.activationEmailService.hashActivationToken(token);

    const [users] = await this.database.execute(
      `SELECT id
       FROM pessoas
       WHERE activation_token_hash = ?
       AND activation_expires_at > NOW()
       AND is_active = 0
       LIMIT 1`,
      [tokenHash],
    );

    if (users.length === 0) {
      const error = new Error("Token de ativação inválido ou expirado.");
      error.statusCode = 400;
      throw error;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await this.database.execute(
      `UPDATE pessoas
       SET password_hash = ?,
           is_active = 1,
           activation_token_hash = NULL,
           activation_expires_at = NULL
       WHERE id = ?
       AND activation_token_hash = ?
       AND activation_expires_at > NOW()
       AND is_active = 0`,
      [passwordHash, users[0].id, tokenHash],
    );

    if (result.affectedRows !== 1) {
      const error = new Error("Não foi possível ativar esta conta.");
      error.statusCode = 400;
      throw error;
    }

    return { id: users[0].id };
  }

  async resendActivation(email) {
    const [users] = await this.database.execute(
      `SELECT id, name
       FROM pessoas
       WHERE email = ?
       AND is_active = 0
       LIMIT 1`,
      [email],
    );

    if (users.length === 0) {
      return;
    }

    const { token, tokenHash, expiresAt } =
      this.activationEmailService.generateActivationToken();

    const [result] = await this.database.execute(
      `UPDATE pessoas
       SET activation_token_hash = ?,
           activation_expires_at = ?
       WHERE id = ?
       AND is_active = 0`,
      [tokenHash, expiresAt, users[0].id],
    );

    if (result.affectedRows !== 1) {
      return;
    }

    await this.activationEmailService.sendActivationEmail(
      email,
      users[0].name,
      token,
    );
  }

  updateUser(id, name, email, registration_number, role, adminRole) {
    this.checkAdmin(adminRole);

    if (
      typeof name !== "string" || !name.trim() ||
      typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof registration_number !== "string" || !registration_number.trim() ||
      !["teacher", "admin"].includes(role)
    ) {
      const error = new Error("Informe nome, email, matrícula e perfil válidos.");
      error.statusCode = 400;
      throw error;
    }

    return this.database.execute(
      `UPDATE pessoas
       SET name = ?,
           email = ?,
           registration_number = ?,
           role = ?
       WHERE id = ?`,
      [name, email, registration_number, role, id],
    );
  }

  deleteUser(id, role) {
    this.checkAdmin(role);

    return this.database.execute(
      `UPDATE pessoas
       SET is_active = 0,
           activation_token_hash = NULL,
           activation_expires_at = NULL
       WHERE id = ?`,
      [id],
    );
  }
}

module.exports = UserController;
