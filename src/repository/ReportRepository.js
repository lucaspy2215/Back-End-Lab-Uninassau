const database = require("../database/Database");

class ReportRepository {
  async findCompletedReservations(filters = {}) {
    let sql = `
      SELECT
        id,
        user_id,
        teacher,
        subject,
        course,
        lab,
        date,
        shift,
        time_slot,
        status
      FROM reservations
      WHERE status = 'completed'
    `;

    const params = [];

    if (filters.startDate) {
      sql += " AND date >= ?";
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      sql += " AND date <= ?";
      params.push(filters.endDate);
    }

    if (filters.lab) {
      sql += " AND lab = ?";
      params.push(filters.lab);
    }

    if (filters.shift) {
      sql += " AND shift = ?";
      params.push(filters.shift);
    }

    if (filters.teacher) {
      sql += " AND teacher = ?";
      params.push(filters.teacher);
    }

    if (filters.course) {
      sql += " AND course = ?";
      params.push(filters.course);
    }

    sql += " ORDER BY date DESC, time_slot ASC";

    const [reservations] = await database.execute(sql, params);

    return reservations;
  }
}

module.exports = ReportRepository;
