const database = require("../database/Database");

class VerificationOfLaboratory {
  constructor() {
    this.database = database;
  }

  async verificationLaboratory(
    lab,
    date,
    shift,
    timeSlot,
    reservationId = null,
    includePending = true,
    connection = this.database,
  ) {
    const sql = `
      SELECT id
      FROM reservations
      WHERE lab = ?
      AND date = ?
      AND shift = ?
      AND time_slot = ?
      AND status IN (
        'pending',
        'active',
        'cancellation_requested',
        'completed'
      )
      AND (? = 1 OR status != 'pending')
      AND (? IS NULL OR id != ?)
      LIMIT 1
      FOR UPDATE
    `;

    const [result] = await connection.execute(sql, [
      lab,
      date,
      shift,
      timeSlot,
      includePending ? 1 : 0,
      reservationId,
      reservationId,
    ]);

    return result.length > 0;
  }
}

module.exports = VerificationOfLaboratory;
