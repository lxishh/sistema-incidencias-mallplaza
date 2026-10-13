const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { rateLimit } = require("express-rate-limit");
const { z } = require("zod");
const { AppError } = require("../errors");
const { requireJefatura } = require("../middleware/auth");
const loginSchema = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(1).max(200),
  })
  .strict();
function authRouter({ config, pool }) {
  const router = express.Router();
  const auth = requireJefatura(config);
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.RATE_LIMIT_LOGIN_MAX,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(
        new AppError(
          429,
          "RATE_LIMITED",
          "Demasiados intentos. Intenta más tarde.",
        ),
      ),
  });
  router.post("/login", limiter, async (req, res, next) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success)
        throw new AppError(
          400,
          "VALIDATION_ERROR",
          "Solicitud inválida",
          parsed.error.issues.map((i) => ({
            field: i.path.join("."),
            issue: i.code,
          })),
        );
      const result = await pool.query(
        "SELECT id, nombre, email, password_hash, rol, activo FROM usuarios WHERE email = $1",
        [parsed.data.email],
      );
      const user = result.rows[0];
      const validPassword = await bcrypt.compare(
        parsed.data.password,
        user?.password_hash ||
          "$2b$12$o533DzLaEP06zCYYLz22yeW7c7xgVXvMUNv5XChZwwZJ1O.xg2zdy",
      );
      if (!user || !user.activo || !validPassword)
        throw new AppError(
          401,
          "INVALID_CREDENTIALS",
          "Credenciales inválidas",
        );
      const sessionTtlMinutes = config.SESSION_TTL_MINUTES;
      const token = jwt.sign({ rol: user.rol }, config.JWT_SECRET, {
        subject: String(user.id),
        algorithm: "HS256",
        expiresIn: `${sessionTtlMinutes}m`,
      });
      res.cookie("mallplaza_session", token, {
        httpOnly: true,
        sameSite: "strict",
        secure: config.NODE_ENV === "production",
        maxAge: sessionTtlMinutes * 60 * 1000,
        path: "/",
      });
      res.status(200).json({
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
      });
    } catch (error) {
      next(error);
    }
  });
  router.post("/logout", (_req, res) => {
    res.clearCookie("mallplaza_session", {
      httpOnly: true,
      sameSite: "strict",
      secure: config.NODE_ENV === "production",
      path: "/",
    });
    res.status(204).end();
  });
  router.get("/me", auth, async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        "SELECT id, nombre, email, rol FROM usuarios WHERE id = $1 AND activo = true",
        [req.user.id],
      );
      if (!rows[0]) throw new AppError(401, "UNAUTHORIZED", "Sesión requerida");
      res.json(rows[0]);
    } catch (error) {
      next(error);
    }
  });
  return router;
}
module.exports = { authRouter };
