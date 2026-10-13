-- Datos de DEMOSTRACIÓN (ficticios) para la tabla `ubicaciones`.
-- Requiere la migración propuesta en docs/propuesta-ubicaciones-qr.md (aún no aprobada ni aplicada).
-- Los nombres no corresponden a un plano real de Mallplaza Copiapó.
INSERT INTO ubicaciones (codigo, nombre, sector, nivel_transito) VALUES
  ('N2Z6K4HRJM', '[DEMO] Acceso principal peatonal', 'Accesos', 'ALTO_TRANSITO'),
  ('S8LL7ZRNWY', '[DEMO] Pasillo central, nivel 1', 'Nivel 1', 'ALTO_TRANSITO'),
  ('F6TWH8U5FX', '[DEMO] Escaleras mecánicas centrales', 'Nivel 1-2', 'ALTO_TRANSITO'),
  ('ET5WN4FYG8', '[DEMO] Patio de comidas, zona de mesas', 'Patio de comidas', 'ALTO_TRANSITO'),
  ('M2WM9XRWJR', '[DEMO] Baños del patio de comidas', 'Patio de comidas', 'ALTO_TRANSITO'),
  ('9N7CWLD3YN', '[DEMO] Hall de acceso al cine', 'Entretención', 'TRANSITO_MEDIO'),
  ('F32MPDJDL2', '[DEMO] Servicio al cliente y cajeros', 'Nivel 1', 'TRANSITO_MEDIO'),
  ('A7QNHC9UZ2', '[DEMO] Pasillo de tiendas, nivel 2', 'Nivel 2', 'TRANSITO_MEDIO'),
  ('3C8MSM3RPR', '[DEMO] Baños del nivel 2', 'Nivel 2', 'TRANSITO_MEDIO'),
  ('BEQXUHTA5J', '[DEMO] Estacionamiento, acceso peatonal', 'Estacionamientos', 'TRANSITO_MEDIO'),
  ('UKSMMJGEMS', '[DEMO] Estacionamiento, sector alejado', 'Estacionamientos', 'BAJO_TRANSITO'),
  ('TJZYUMV3RC', '[DEMO] Andén de carga y descarga', 'Servicios internos', 'BAJO_TRANSITO'),
  ('9CPW6695DS', '[DEMO] Pasillo de servicio y bodega de mantenimiento', 'Servicios internos', 'BAJO_TRANSITO')
ON CONFLICT (codigo) DO NOTHING;
