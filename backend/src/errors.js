class AppError extends Error {
  constructor(status, code, message, details = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
function errorPayload(error) {
  return {
    error: {
      code: error.code || "INTERNAL_ERROR",
      message: error.status ? error.message : "Error interno del servidor",
      details: Array.isArray(error.details) ? error.details : [],
    },
  };
}
module.exports = { AppError, errorPayload };
