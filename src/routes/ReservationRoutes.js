const express = require("express");
const catchErrors = require("../middleware/CatchErrors");
const ReservationController = require("../controller/ControllerReservation");
const authMiddleware = require("../middleware/AuthMiddleware");

const router = express.Router();
const reservationController = new ReservationController();

const REQUIRED_FIELDS = [
  "subject",
  "course",
  "lab",
  "date",
  "shift",
  "timeSlot",
];

function adminMiddleware(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      error: "Acesso permitido somente para administradores.",
    });
  }

  next();
}

router.get(
  "/",
  catchErrors(async (req, res) => {
    const { lab = null, shift = null, start = null, end = null } = req.query;

    const [reservations] = await reservationController.readPublicReservations(
      lab,
      shift,
      start,
      end,
    );

    res.json(reservations);
  }),
);

router.get(
  "/manage",
  authMiddleware,
  catchErrors(async (req, res) => {
    const { lab = null, shift = null, start = null, end = null } = req.query;

    const [reservations] = await reservationController.readReservation(
      req.user.id,
      req.user.role,
      lab,
      shift,
      start,
      end,
    );

    res.json(reservations);
  }),
);

router.post(
  "/",
  authMiddleware,
  catchErrors(async (req, res) => {
    const missingField = REQUIRED_FIELDS.find(
      (field) =>
        req.body[field] === undefined ||
        req.body[field] === null ||
        req.body[field] === "",
    );

    if (missingField) {
      return res.status(400).json({
        error: `Campo obrigatório: ${missingField}`,
      });
    }

    const { teacherId, subject, course, lab, date, shift, timeSlot } = req.body;

    const result = await reservationController.createReservation(
      req.user.id,
      req.user.role,
      teacherId,
      subject,
      course,
      lab,
      date,
      shift,
      timeSlot,
    );

    res.status(201).json({ id: result.insertId });
  }),
);

router.patch(
  "/:id/approve",
  authMiddleware,
  adminMiddleware,
  catchErrors(async (req, res) => {
    await reservationController.approveReservation(
      req.params.id,
      req.user.role,
    );

    res.sendStatus(204);
  }),
);

router.patch(
  "/:id/reject",
  authMiddleware,
  adminMiddleware,
  catchErrors(async (req, res) => {
    await reservationController.rejectReservation(req.params.id, req.user.role);

    res.sendStatus(204);
  }),
);

router.patch(
  "/:id/complete",
  authMiddleware,
  adminMiddleware,
  catchErrors(async (req, res) => {
    await reservationController.completeReservation(
      req.params.id,
      req.user.role,
    );

    res.sendStatus(204);
  }),
);

router.patch(
  "/:id/request-cancellation",
  authMiddleware,
  catchErrors(async (req, res) => {
    await reservationController.requestCancellation(
      req.params.id,
      req.user.id,
      req.user.role,
    );

    res.sendStatus(204);
  }),
);

router.patch(
  "/:id/resolve-cancellation",
  authMiddleware,
  adminMiddleware,
  catchErrors(async (req, res) => {
    await reservationController.resolveCancellation(
      req.params.id,
      req.body.action,
      req.user.role,
    );

    res.sendStatus(204);
  }),
);

router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  catchErrors(async (req, res) => {
    await reservationController.deleteReservation(req.params.id, req.user.role);

    res.sendStatus(204);
  }),
);

module.exports = router;
