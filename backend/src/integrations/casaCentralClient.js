class CasaCentralError extends Error {
  constructor(type, status) {
    super(type);
    this.name = "CasaCentralError";
    this.type = type;
    if (status) this.status = status;
  }
}
function createCasaCentralClient({
  mode = "success",
  timeoutMs = 5000,
  transport,
} = {}) {
  return {
    async crearOrdenTrabajo(_incidencia) {
      if (mode === "timeout") {
        await new Promise((resolve) => setTimeout(resolve, timeoutMs));
        throw new CasaCentralError("TIMEOUT");
      }
      if (mode === "network_error") throw new CasaCentralError("NETWORK_ERROR");
      if (mode === "http_error") throw new CasaCentralError("HTTP_ERROR", 500);
      if (mode !== "success") throw new TypeError("Modo mock desconocido");
      if (!transport) return { id_externo: "MOCK-1" };
      let timer;
      try {
        return await Promise.race([
          transport({ timeoutMs }),
          new Promise((_, reject) => {
            timer = setTimeout(
              () => reject(new CasaCentralError("TIMEOUT")),
              timeoutMs,
            );
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
module.exports = { createCasaCentralClient, CasaCentralError };
