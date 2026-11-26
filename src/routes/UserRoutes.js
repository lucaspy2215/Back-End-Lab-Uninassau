const express = require("express");
const catchErrors = require("../middleware/CatchErrors");
const UserController = require("../controller/ControllerUser");
const authMiddleware = require("../middleware/AuthMiddleware");

const router = express.Router();
const userController = new UserController();

function adminMiddleware(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      error: "Acesso permitido somente para administradores.",
    });
  }

  next();
}

// Consultar usuários: somente administradores
router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  catchErrors(async (req, res) => {
    const [users] = await userController.readUser(req.user.role);

    res.json(users);
  }),
);

// Cadastro público: sempre cria professores
router.post(
  "/",
  catchErrors(async (req, res) => {
    const { name, email, registration_number } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof registration_number !== "string" ||
      !registration_number.trim()
    ) {
      return res.status(400).json({
        error: "Informe nome, email e matrícula.",
      });
    }

    const result = await userController.createUser(
      name.trim(),
      email.trim(),
      registration_number.trim(),
    );

    res.status(201).json({ id: result.insertId });
  }),
);

// Reenviar ativação: público
router.post(
  "/resend-activation",
  catchErrors(async (req, res) => {
    const { email } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        error: "Informe um email válido.",
      });
    }

    await userController.resendActivation(email.trim());

    res.status(200).json({
      message:
        "Se a conta existir e estiver pendente de ativação, um novo link de ativação será enviado.",
    });
  }),
);

// Login: público
router.post(
  "/login",
  catchErrors(async (req, res) => {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        error: "Informe seu email e sua senha.",
      });
    }

    const result = await userController.login(email.trim(), password);

    res.status(200).json(result);
  }),
);

// Ativação: público
router.post(
  "/activate",
  catchErrors(async (req, res) => {
    const { token, password } = req.body;

    if (
      typeof token !== "string" ||
      !token.trim() ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res.status(400).json({
        error:
          "Informe um token válido e uma senha com pelo menos 8 caracteres.",
      });
    }

    const user = await userController.activateUser(token, password);

    res.status(200).json({
      message: "Conta ativada com sucesso.",
      id: user.id,
    });
  }),
);

// Editar usuário: somente administradores
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  catchErrors(async (req, res) => {
    const { name, email, registration_number, role } = req.body;

    await userController.updateUser(
      req.params.id,
      name,
      email,
      registration_number,
      role,
      req.user.role,
    );

    res.sendStatus(204);
  }),
);

// Excluir usuário: somente administradores
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  catchErrors(async (req, res) => {
    await userController.deleteUser(req.params.id, req.user.role);

    res.sendStatus(204);
  }),
);

module.exports = router;
