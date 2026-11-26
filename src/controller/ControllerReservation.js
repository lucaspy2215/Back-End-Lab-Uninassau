const database = require("../database/Database");
const VerificationTeachers = require("../verification/verificationTeacher");
const VerificationOfLaboratory = require("../verification/verificationLaboratory");

class ReservationController {
  constructor() {
    this.database = database;
    this.verification = new VerificationTeachers();
    this.verificationLaboratory = new VerificationOfLaboratory();
  }

  createError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  handleDatabaseError(error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw this.createError(
        "Este horário já está ocupado por outra reserva. Escolha outro horário.",
        409,
      );
    }

    throw error;
  }

  validateReservationDate(date) {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw this.createError("Data inválida. Informe uma data válida.", 400);
    }

    const [year, month, day] = date.split("-").map(Number);

    if (year < 2026 || year > 2100) {
      throw this.createError(
        "O ano informado é inválido. Escolha uma data entre 2026 e 2100.",
        400,
      );
    }

    const parsedDate = new Date(Date.UTC(year, month - 1, day));

    if (
      parsedDate.getUTCFullYear() !== year ||
      parsedDate.getUTCMonth() !== month - 1 ||
      parsedDate.getUTCDate() !== day
    ) {
      throw this.createError("A data informada não existe no calendário.", 400);
    }
  }

  async createReservation(
    userId,
    role,
    teacherId,
    subject,
    course,
    lab,
    date,
    shift,
    timeSlot,
  ) {
    this.validateReservationDate(date);

    const connection = await this.database.getConnection();

    try {
      await connection.beginTransaction();

      let targetTeacherId;

      if (role === "admin") {
        if (!Number.isInteger(Number(teacherId)) || Number(teacherId) <= 0) {
          throw this.createError("Selecione um professor válido.", 400);
        }

        targetTeacherId = Number(teacherId);
      } else if (role === "teacher") {
        targetTeacherId = userId;
      } else {
        throw this.createError(
          "Perfil sem permissão para criar reservas.",
          403,
        );
      }

      const [users] = await connection.execute(
        `SELECT id, name, role, is_active
         FROM pessoas
         WHERE id = ?
         LIMIT 1
         FOR UPDATE`,
        [targetTeacherId],
      );

      if (
        users.length === 0 ||
        users[0].role !== "teacher" ||
        Number(users[0].is_active) !== 1
      ) {
        throw this.createError(
          "O professor selecionado não existe ou não está ativo.",
          403,
        );
      }

      const teacherScheduled = await this.verification.verificationOfTeachers(
        targetTeacherId,
        date,
        shift,
        timeSlot,
        null,
        true,
        connection,
      );

      if (teacherScheduled) {
        throw this.createError(
          "Este professor já possui uma solicitação ou reserva para esse dia e horário. Escolha outro horário.",
          409,
        );
      }

      const laboratoryScheduled =
        await this.verificationLaboratory.verificationLaboratory(
          lab,
          date,
          shift,
          timeSlot,
          null,
          true,
          connection,
        );

      if (laboratoryScheduled) {
        throw this.createError(
          "Este laboratório já está ocupado por outro professor nesse dia e horário. Escolha outro laboratório ou horário.",
          409,
        );
      }

      const [result] = await connection.execute(
        `INSERT INTO reservations
         (user_id, teacher, subject, course, lab, date, shift, time_slot, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          targetTeacherId,
          users[0].name,
          subject,
          course,
          lab,
          date,
          shift,
          timeSlot,
        ],
      );

      await connection.commit();

      return result;
    } catch (error) {
      await connection.rollback();
      this.handleDatabaseError(error);
    } finally {
      connection.release();
    }
  }

  async approveReservation(id, role) {
    if (role !== "admin") {
      throw this.createError(
        "Somente administradores podem aprovar reservas.",
        403,
      );
    }

    const connection = await this.database.getConnection();

    try {
      await connection.beginTransaction();

      const [reservations] = await connection.execute(
        `SELECT id, user_id, lab, date, shift, time_slot, status
         FROM reservations
         WHERE id = ?
         LIMIT 1
         FOR UPDATE`,
        [id],
      );

      if (reservations.length === 0 || reservations[0].status !== "pending") {
        throw this.createError(
          "Solicitação não encontrada ou não está pendente.",
          404,
        );
      }

      const reservation = reservations[0];

      const teacherScheduled = await this.verification.verificationOfTeachers(
        reservation.user_id,
        reservation.date,
        reservation.shift,
        reservation.time_slot,
        id,
        false,
        connection,
      );

      if (teacherScheduled) {
        throw this.createError(
          "Não foi possível aprovar: este professor já possui outra reserva nesse dia e horário.",
          409,
        );
      }

      const laboratoryScheduled =
        await this.verificationLaboratory.verificationLaboratory(
          reservation.lab,
          reservation.date,
          reservation.shift,
          reservation.time_slot,
          id,
          false,
          connection,
        );

      if (laboratoryScheduled) {
        throw this.createError(
          "Não foi possível aprovar: este laboratório já está reservado nesse dia e horário.",
          409,
        );
      }

      const [result] = await connection.execute(
        `UPDATE reservations
         SET status = 'active'
         WHERE id = ?
         AND status = 'pending'`,
        [id],
      );

      if (result.affectedRows !== 1) {
        throw this.createError(
          "Não foi possível aprovar esta solicitação.",
          409,
        );
      }

      await connection.commit();

      return result;
    } catch (error) {
      await connection.rollback();
      this.handleDatabaseError(error);
    } finally {
      connection.release();
    }
  }

  async rejectReservation(id, role) {
    if (role !== "admin") {
      throw this.createError(
        "Somente administradores podem rejeitar solicitações.",
        403,
      );
    }

    const [result] = await this.database.execute(
      `UPDATE reservations
       SET status = 'rejected',
           rejected_at = NOW()
       WHERE id = ?
       AND status = 'pending'`,
      [id],
    );

    if (result.affectedRows !== 1) {
      throw this.createError(
        "Solicitação não encontrada ou não está pendente.",
        404,
      );
    }

    return result;
  }

  async readReservation(userId, role, lab, shift, startDate, endDate) {
    let sql = `
      SELECT *
      FROM reservations
      WHERE (? IS NULL OR lab = ?)
      AND (? IS NULL OR shift = ?)
      AND (? IS NULL OR date >= ?)
      AND (? IS NULL OR date <= ?)
    `;

    const params = [
      lab,
      lab,
      shift,
      shift,
      startDate,
      startDate,
      endDate,
      endDate,
    ];

    if (role === "teacher") {
      sql += `
        AND user_id = ?
        AND (
          status != 'completed'
          OR completed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        )
      `;

      params.push(userId);
    } else if (role !== "admin") {
      throw this.createError(
        "Perfil sem permissão para consultar reservas.",
        403,
      );
    }

    sql += " ORDER BY date, time_slot";

    return this.database.execute(sql, params);
  }

  async readPublicReservations(lab, shift, startDate, endDate) {
    const sql = `
      SELECT id, teacher, subject, course, lab, date, shift, time_slot, status
      FROM reservations
      WHERE status = 'active'
      AND (? IS NULL OR lab = ?)
      AND (? IS NULL OR shift = ?)
      AND (? IS NULL OR date >= ?)
      AND (? IS NULL OR date <= ?)
      ORDER BY date, time_slot
    `;

    const params = [
      lab,
      lab,
      shift,
      shift,
      startDate,
      startDate,
      endDate,
      endDate,
    ];

    return this.database.execute(sql, params);
  }

  async updateReservation(id, teacher, subject, role) {
    if (role !== "admin") {
      throw this.createError(
        "Somente administradores podem editar reservas.",
        403,
      );
    }

    return this.database.execute(
      `UPDATE reservations
       SET teacher = ?, subject = ?
       WHERE id = ?`,
      [teacher, subject, id],
    );
  }

  async completeReservation(id, role) {
    if (role !== "admin") {
      throw this.createError(
        "Somente administradores podem concluir reservas.",
        403,
      );
    }

    const [result] = await this.database.execute(
      `UPDATE reservations
       SET status = 'completed',
           completed_at = NOW()
       WHERE id = ?
       AND status = 'active'`,
      [id],
    );

    if (result.affectedRows !== 1) {
      throw this.createError("Reserva não encontrada ou não está ativa.", 404);
    }

    return result;
  }

  async requestCancellation(id, userId, role) {
    if (role !== "teacher") {
      throw this.createError(
        "Somente professores podem solicitar o cancelamento de reservas.",
        403,
      );
    }

    const [result] = await this.database.execute(
      `UPDATE reservations
       SET status = 'cancellation_requested'
       WHERE id = ?
       AND user_id = ?
       AND status = 'active'`,
      [id, userId],
    );

    if (result.affectedRows !== 1) {
      throw this.createError(
        "Reserva não encontrada, não pertence a este professor ou não está disponível para cancelamento.",
        404,
      );
    }

    return result;
  }

  async resolveCancellation(id, action, role) {
    if (role !== "admin") {
      throw this.createError(
        "Somente administradores podem resolver solicitações de cancelamento.",
        403,
      );
    }

    if (!["approve", "reject"].includes(action)) {
      throw this.createError("Ação de cancelamento inválida.", 400);
    }

    const status = action === "approve" ? "cancelled" : "active";

    const [result] = await this.database.execute(
      `UPDATE reservations
       SET status = ?
       WHERE id = ?
       AND status = 'cancellation_requested'`,
      [status, id],
    );

    if (result.affectedRows !== 1) {
      throw this.createError(
        "Solicitação não encontrada ou já foi resolvida.",
        404,
      );
    }

    return result;
  }

  async deleteReservation(id, role) {
    if (role !== "admin") {
      throw this.createError(
        "Somente administradores podem excluir reservas.",
        403,
      );
    }

    const [result] = await this.database.execute(
      `DELETE FROM reservations
       WHERE id = ?
       AND status IN ('pending', 'rejected', 'cancelled')`,
      [id],
    );

    if (result.affectedRows !== 1) {
      throw this.createError(
        "Reserva não encontrada ou protegida pelo histórico.",
        409,
      );
    }

    return result;
  }
}

module.exports = ReservationController;
