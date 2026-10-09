const jwt = require("jsonwebtoken");
const { AppError } = require("../errors");
function requireJefatura(config) {
  return (req, _res, next) => {
    try {
      const token = req.cookies?.mallplaza_session;
      if (!token) throw new Error("missing");
      const payload = jwt.verify(token, config.JWT_SECRET, {
        algorithms: ["HS256"],
      });
      if (payload.rol !== "JEFATURA" || !payload.sub)
        throw new Error("invalid");
      req.user = { id: payload.sub, rol: payload.rol };
      next();
    } catch {
      next(new AppError(401, "UNAUTHORIZED", "Sesión requerida"));
    }
  };
}
module.exports = { requireJefatura };
