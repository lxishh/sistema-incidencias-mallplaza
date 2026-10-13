#!/usr/bin/env bash
# Crea los issues del plan de trabajo (docs/plan-trabajo-equipo.md).
# Requisitos: GitHub CLI (gh) autenticado. Ejecutar desde la raíz del repo.
set -euo pipefail

gh label create "antes-14-oct" --color D93F0B --force >/dev/null
gh label create "backlog" --color 0E8A16 --force >/dev/null

crear() { # titulo | etiqueta | cuerpo
  gh issue create --title "$1" --label "$2" --body "$3"
}

crear "T1 Limpieza de Git y CI" antes-14-oct "Aplicar parche de docs, quitar frontend/dist del índice, crear main y develop, verificar CI. Aceptación: git ls-files frontend/dist vacío; CI en verde."
crear "T2 Lista de ubicaciones y preguntas bloqueantes con el cliente" antes-14-oct "Pedir a Mauricio Maldonado la lista de ubicaciones/sectores y respuestas bloqueantes de docs/preguntas.md. Aceptación: lista recibida o fecha comprometida."
crear "T3 Decidir propuesta de ubicaciones y QR" antes-14-oct "Revisar docs/propuesta-ubicaciones-qr.md. Aceptación: decisión registrada."
crear "T4 Tabla ubicaciones + API por código" antes-14-oct "Migración nueva, GET /api/ubicaciones/:codigo, codigo_ubicacion en POST /api/incidencias, con pruebas. Depende de T3."
crear "T5 Formulario con ubicación precargada" antes-14-oct "Campo manual de código, ubicación bloqueada al resolverlo, datos DEMO ficticios. Depende de T4."
crear "T6 Diagnosticar ERR_ABORTED del logout" antes-14-oct "Reproducir con traza de red y documentar causa. No afirmar causa sin evidencia."
crear "T7 Ensayos de demo" antes-14-oct "Dos ensayos completos con docs/guion-demo-14-oct.md en el equipo de exposición y con celular real."
crear "T8 Carga de fotos" backlog "Endpoint multipart, 0 a 3 imágenes, hasta 2 MB, jpeg/png/webp, validar contenido real. RF-12, 13, 35, RNF-11."
crear "T9 Escáner QR con cámara en la PWA" backlog "Requiere librería de lectura (aprobación de stack) y HTTPS para probar en celular."
crear "T10 Administración de ubicaciones y hoja de QR" backlog "CRUD para Jefatura y hoja imprimible; el QR contiene solo el código."
crear "T11 Gráficos en el panel KPI" backlog "Chart.js: prioridad, tipo, ubicación y sector."
crear "T12 Worker de sincronización con Casa Central" backlog "RF-36 a 40. Bloqueado por contrato externo."
crear "T13 Pruebas en iPhone y Android reales" backlog "Instalar PWA, formulario, rendimiento."
crear "T14 Revocar o acortar la vigencia del token de sesión" backlog "Hallazgo TC-46: la cookie copiada antes de cerrar sesión sigue siendo válida hasta 8 horas. Acortar la vigencia o agregar revocación en el servidor."

