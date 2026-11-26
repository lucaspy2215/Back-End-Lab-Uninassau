const ReportService = require("../services/ReportService");

class ReportController {
  constructor() {
    this.service = new ReportService();
  }

  async viewReport(filters = {}) {
    return this.service.viewReport(filters);
  }
}

module.exports = ReportController;
