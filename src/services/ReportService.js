const ReportRepository = require("../repository/ReportRepository");
const VerificationReport = require("../verification/VerificationReport");

class ReportService {
  constructor() {
    this.repository = new ReportRepository();
    this.verification = new VerificationReport();
  }

  groupBy(reservations, field) {
    const groups = {};

    reservations.forEach((reservation) => {
      const key = reservation[field];

      groups[key] = (groups[key] || 0) + 1;
    });

    return Object.entries(groups).map(([name, total]) => ({
      name,
      total,
    }));
  }

  generateReport(reservations) {
    const byMonth = this.groupBy(
      reservations.map((reservation) => ({
        ...reservation,
        month: reservation.date.substring(0, 7),
      })),
      "month",
    ).sort((a, b) => a.name.localeCompare(b.name));

    const bySemester = this.groupBy(
      reservations.map((reservation) => {
        const year = reservation.date.substring(0, 4);
        const month = Number(reservation.date.substring(5, 7));
        const semester = month <= 6 ? "1º Semestre" : "2º Semestre";

        return {
          ...reservation,
          semester: `${year} - ${semester}`,
        };
      }),
      "semester",
    ).sort((a, b) => a.name.localeCompare(b.name));

    const byTimeSlot = this.groupBy(reservations, "time_slot").sort(
      (a, b) => Number(a.name) - Number(b.name),
    );

    const highestMonth =
      [...byMonth].sort((a, b) => b.total - a.total)[0] || null;

    const mostUsedTimeSlot =
      [...byTimeSlot].sort((a, b) => b.total - a.total)[0] || null;

    return {
      totalCompleted: reservations.length,
      byLab: this.groupBy(reservations, "lab"),
      byShift: this.groupBy(reservations, "shift"),
      byCourse: this.groupBy(reservations, "course"),
      byTeacher: this.groupBy(reservations, "teacher"),
      byTimeSlot,
      byMonth,
      bySemester,
      highestMonth,
      mostUsedTimeSlot,
    };
  }

  async viewReport(filters = {}) {
    this.verification.validateFilters(filters);

    const reservations =
      await this.repository.findCompletedReservations(filters);

    return {
      reservations,
      indicators: this.generateReport(reservations),
    };
  }
}

module.exports = ReportService;
