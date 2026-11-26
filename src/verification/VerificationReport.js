class VerificationReport {
  createError(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
  }

  validateDate(date, fieldName) {
    if (date === null || date === undefined || date === "") {
      return;
    }

    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw this.createError(`${fieldName} deve estar no formato YYYY-MM-DD.`);
    }

    const [year, month, day] = date.split("-").map(Number);
    const parsedDate = new Date(Date.UTC(year, month - 1, day));

    if (
      parsedDate.getUTCFullYear() !== year ||
      parsedDate.getUTCMonth() !== month - 1 ||
      parsedDate.getUTCDate() !== day ||
      year < 1000 ||
      year > 9999
    ) {
      throw this.createError(`${fieldName} não é uma data válida.`);
    }
  }

  validateLab(lab) {
    if (lab === null || lab === undefined || lab === "") {
      return;
    }

    const validLabs = ["Lab 01", "Lab 02"];

    if (!validLabs.includes(lab)) {
      throw this.createError("Laboratório inválido.");
    }
  }

  validateShift(shift) {
    if (shift === null || shift === undefined || shift === "") {
      return;
    }

    const validShifts = ["Manhã", "Tarde", "Noite"];

    if (!validShifts.includes(shift)) {
      throw this.createError("Turno inválido.");
    }
  }

  validateText(value, fieldName) {
    if (value === null || value === undefined || value === "") {
      return;
    }

    if (
      typeof value !== "string" ||
      value.trim().length === 0 ||
      value.length > 100
    ) {
      throw this.createError(`${fieldName} inválido.`);
    }
  }

  validateFilters(filters = {}) {
    const allowedFields = [
      "startDate",
      "endDate",
      "lab",
      "shift",
      "teacher",
      "course",
    ];

    for (const field of Object.keys(filters)) {
      if (!allowedFields.includes(field)) {
        throw this.createError(`Filtro não permitido: ${field}.`);
      }
    }

    this.validateDate(filters.startDate, "Data inicial");
    this.validateDate(filters.endDate, "Data final");
    this.validateLab(filters.lab);
    this.validateShift(filters.shift);
    this.validateText(filters.teacher, "Professor");
    this.validateText(filters.course, "Curso");

    if (
      filters.startDate &&
      filters.endDate &&
      filters.startDate > filters.endDate
    ) {
      throw this.createError(
        "A data inicial não pode ser posterior à data final.",
      );
    }

    return true;
  }
}

module.exports = VerificationReport;
