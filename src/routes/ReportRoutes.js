const express = require("express");
const catchErrors = require("../middleware/CatchErrors");
const ReportController = require("../controller/ControllerReport");
const authMiddleware = require("../middleware/AuthMiddleware");

const router = express.Router();
const reportController = new ReportController();

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
  authMiddleware,
  adminMiddleware,
  catchErrors(async (req, res) => {
    const report = await reportController.viewReport(req.query);

    res.json(report);
  }),
);

module.exports = router;
