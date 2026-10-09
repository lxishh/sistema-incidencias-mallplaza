const messages = {
  HTTP_ERROR: (status) => `Respuesta HTTP ${status}`,
  TIMEOUT: () => "Timeout de 5000 ms",
  NETWORK_ERROR: () => "Error de red",
};
async function registrarIntento({
  pool,
  incidenciaId,
  numeroIntento,
  resultado,
}) {
  if (
    resultado?.tipo === "HTTP_ERROR" &&
    (!Number.isInteger(resultado.status) ||
      resultado.status < 100 ||
      resultado.status > 599)
  )
    throw new TypeError("Código HTTP inválido");
  const mapping = {
    OK: {
      resultado: "OK",
      status: null,
      id: resultado.idExterno || null,
      detail: null,
    },
    HTTP_ERROR: {
      resultado: "ERROR_HTTP",
      status: resultado.status,
      id: null,
      detail: messages.HTTP_ERROR(resultado.status),
    },
    TIMEOUT: {
      resultado: "TIMEOUT",
      status: null,
      id: null,
      detail: messages.TIMEOUT(),
    },
    NETWORK_ERROR: {
      resultado: "ERROR_RED",
      status: null,
      id: null,
      detail: messages.NETWORK_ERROR(),
    },
  };
  const entry = mapping[resultado?.tipo];
  if (!entry) throw new TypeError("Tipo de resultado de auditoría inválido");
  const { rows } = await pool.query(
    "INSERT INTO log_auditoria_api (incidencia_id, numero_intento, http_status, resultado, id_externo_mallplaza, detalle_error) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, incidencia_id, numero_intento, http_status, resultado, id_externo_mallplaza, detalle_error",
    [
      incidenciaId,
      numeroIntento,
      entry.status,
      entry.resultado,
      entry.id,
      entry.detail,
    ],
  );
  return rows[0];
}
module.exports = { registrarIntento };
