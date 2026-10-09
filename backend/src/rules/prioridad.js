function calcularPrioridad({
  ubicacion,
  impacto_operativo,
  riesgo_accidente,
  afecta_terceros,
}) {
  if (impacto_operativo && ubicacion === "ALTO_TRANSITO") return "CRITICA";
  if (riesgo_accidente || afecta_terceros) return "ALTA";
  if (ubicacion === "ALTO_TRANSITO" || impacto_operativo) return "MEDIA";
  return "BAJA";
}
module.exports = { calcularPrioridad };
