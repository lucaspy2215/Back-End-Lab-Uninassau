const test = require("node:test");
const assert = require("node:assert/strict");

const ReservationController = require("../src/controller/ControllerReservation");
const VerificationReport = require("../src/verification/VerificationReport");
const ActivationEmailService = require("../src/services/ActivationEmailService");
const ReportService = require("../src/services/ReportService");

test("accepts valid reservation dates", () => {
  const controller = Object.create(ReservationController.prototype);

  assert.doesNotThrow(() => {
    controller.validateReservationDate("2026-11-26");
  });

  assert.doesNotThrow(() => {
    controller.validateReservationDate("2028-02-29");
  });
});

test("rejects invalid reservation dates", () => {
  const controller = Object.create(ReservationController.prototype);

  for (const date of [
    "2026-02-30",
    "2026-13-01",
    "2025-12-31",
    "2101-01-01",
    "invalid-date",
  ]) {
    assert.throws(
      () => controller.validateReservationDate(date),
      { statusCode: 400 },
    );
  }
});

test("accepts valid report filters", () => {
  const verification = new VerificationReport();

  assert.equal(
    verification.validateFilters({
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      lab: "Lab 01",
      shift: "Noite",
      teacher: "Professor Demo",
      course: "ADS",
    }),
    true,
  );
});

test("rejects invalid report filters", () => {
  const verification = new VerificationReport();

  assert.throws(
    () => verification.validateFilters({ lab: "Lab 03" }),
    { statusCode: 400 },
  );

  assert.throws(
    () => verification.validateFilters({ shift: "Madrugada" }),
    { statusCode: 400 },
  );

  assert.throws(
    () => verification.validateFilters({
      startDate: "2026-12-31",
      endDate: "2026-01-01",
    }),
    { statusCode: 400 },
  );

  assert.throws(
    () => verification.validateFilters({ unknown: "value" }),
    { statusCode: 400 },
  );
});

test("escapes HTML in activation email names", () => {
  const service = Object.create(ActivationEmailService.prototype);

  assert.equal(
    service.escapeHtml('<script>alert("test")</script>'),
    "&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;",
  );
});

test("generates report indicators correctly", () => {
  const service = Object.create(ReportService.prototype);

  const reservations = [
    {
      date: "2026-01-15",
      lab: "Lab 01",
      shift: "Manhã",
      course: "ADS",
      teacher: "Professor A",
      time_slot: 1,
    },
    {
      date: "2026-01-20",
      lab: "Lab 01",
      shift: "Manhã",
      course: "ADS",
      teacher: "Professor A",
      time_slot: 1,
    },
    {
      date: "2026-08-10",
      lab: "Lab 02",
      shift: "Noite",
      course: "Redes",
      teacher: "Professor B",
      time_slot: 2,
    },
  ];

  const report = service.generateReport(reservations);

  assert.equal(report.totalCompleted, 3);
  assert.equal(report.byLab.length, 2);
  assert.equal(report.byMonth.length, 2);
  assert.equal(report.bySemester.length, 2);

  assert.deepEqual(report.highestMonth, {
    name: "2026-01",
    total: 2,
  });

  assert.deepEqual(report.mostUsedTimeSlot, {
    name: "1",
    total: 2,
  });
});
