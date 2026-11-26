const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).json({
      error: "Autenticação necessária.",
    });
  }

  const [type, token, ...extra] = authorization.trim().split(/\s+/);

  if (type !== "Bearer" || !token || extra.length > 0) {
    return res.status(401).json({
      error: "Formato de token inválido.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      error: "Token inválido ou expirado.",
    });
  }
}

module.exports = authMiddleware;
