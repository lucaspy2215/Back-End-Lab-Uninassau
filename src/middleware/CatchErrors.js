const HTTP_CONFLICT = 409;
const HTTP_SERVER_ERROR = 500;

module.exports =
  (route, duplicateMessage = "Horário já reservado.") =>
  async (req, res) => {
    try {
      await route(req, res);
    } catch (error) {
      console.error(error);

      if (error.code === "ER_DUP_ENTRY") {
        return res.status(HTTP_CONFLICT).json({ error: duplicateMessage });
      }
      const statusCode = error.statusCode || HTTP_SERVER_ERROR;

      res.status(statusCode).json({
        error:
          statusCode === HTTP_SERVER_ERROR ? "Erro interno." : error.message,
      });
    }
  };
