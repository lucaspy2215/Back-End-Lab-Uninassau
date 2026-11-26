require("dotenv").config();

const express = require("express");
const cors = require("cors");

const reservationRoutes = require("./src/routes/ReservationRoutes");
const userRoutes = require("./src/routes/UserRoutes");
const reportRoutes = require("./src/routes/ReportRoutes");
const database = require("./src/database/Database");

const PORT = Number(process.env.PORT || 3001);
const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.NODE_ENV !== "production"
    ? ["http://localhost:3000"]
    : []),
].filter(Boolean);

async function deleteExpiredRejectedReservations() {
  await database.execute(
    `DELETE FROM reservations
     WHERE status = 'rejected'
     AND rejected_at IS NOT NULL
     AND rejected_at <= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
  );
}

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use("/reservations", reservationRoutes);
app.use("/users", userRoutes);
app.use("/reports", reportRoutes);

deleteExpiredRejectedReservations().catch((error) => {
  console.error("Reservation cleanup failed:", error);
});

const cleanupInterval = setInterval(() => {
  deleteExpiredRejectedReservations().catch((error) => {
    console.error("Reservation cleanup failed:", error);
  });
}, 60 * 1000);

cleanupInterval.unref();

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
