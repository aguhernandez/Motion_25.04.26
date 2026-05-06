/*
  # Add Reference Ranges for Swimming Biomechanics

  ## Summary
  Inserts reference ranges for all 4 swimming strokes based on published sports science.
  Sources: Maglischo (2003), Toussaint & Beek (1992), competitive swimming biomechanics research.

  ## New Reference Ranges

  ### Freestyle / Crol (discipline: 'freestyle')
  - Entrada de Mano: 140–160° (hombro-cadera alineación al entrar)
  - Codo Alto / Early VB: 70–100° (ángulo de codo en tirón)
  - Rotación de Cadera: 130–160° (eje longitudinal, rotación bilateral)
  - Rodilla Patada: 140–170° (extensión en patada descendente)
  - Ángulo de Cuello: 160–175° (cabeza neutra en agua)
  - Trayectoria de Brazo: 120–160° (recorrido de brazo en tirón)

  ### Backstroke / Espalda (discipline: 'backstroke')
  - Salida de Mano: 130–160° (entrada por encima del hombro)
  - Tirón Dorsal: 70–100° (codo alto en tirón dorsal)
  - Rotación Dorsal: 130–160° (rotación eje longitudinal)
  - Patada Dorsal: 140–170° (extensión patada)
  - Cabeza Neutra Dorsal: 160–175° (cabeza neutra)

  ### Breaststroke / Pecho (discipline: 'breaststroke')
  - Apertura de Brazos: 90–120° (ángulo de apertura bilateral)
  - Flexión de Rodilla (Pechada): 90–130° (recuperación de piernas)
  - Dorsiflexión Tobillo: 80–100° (posición del pie)
  - Ángulo de Tirón: 80–110° (codo en fase propulsiva)
  - Elevación de Cabeza: 155–170° (mínima extensión para respirar)

  ### Butterfly / Mariposa (discipline: 'butterfly')
  - Entrada Mariposa: 135–155° (entrada bilateral)
  - Codo Alto Mariposa: 70–100° (EVF bilateral)
  - Undulación Cadera: 155–175° (amplitud de onda corporal)
  - Patada Delfín: 135–165° (extensión en patada)
  - Recuperación Aérea: 100–140° (brazo en recuperación sobre agua)
*/

INSERT INTO reference_ranges (discipline, angle_name, min_deg, max_deg, optimal_min_deg, optimal_max_deg, description)
VALUES
  ('freestyle', 'Entrada de Mano',       135, 165, 140, 160, 'Ángulo hombro-cadera al entrar la mano al agua. Entrada al frente del hombro.'),
  ('freestyle', 'Codo Alto (Early VB)',  65,  110, 70,  100, 'Early Vertical Forearm: codo elevado en tirón para maximizar propulsión.'),
  ('freestyle', 'Rotación de Cadera',    125, 165, 130, 160, 'Rotación bilateral sobre eje longitudinal. 40-50° sobre neutral = 130-140°.'),
  ('freestyle', 'Rodilla Patada',        135, 175, 140, 170, 'Extensión de rodilla en patada descendente. Origen en cadera.'),
  ('freestyle', 'Ángulo de Cuello',      155, 178, 160, 175, 'Posición neutra de cabeza en agua. Sin hiperextensión ni flexión.'),
  ('freestyle', 'Trayectoria de Brazo',  115, 165, 120, 160, 'Recorrido del codo en tirón bajo el cuerpo.'),

  ('backstroke', 'Salida de Mano',       125, 165, 130, 160, 'Entrada de mano al agua por encima del hombro, sin cruzar línea media.'),
  ('backstroke', 'Tirón Dorsal',         65,  110, 70,  100, 'Codo alto en tirón dorsal para maximizar propulsión.'),
  ('backstroke', 'Rotación Dorsal',      125, 165, 130, 160, 'Rotación sobre eje longitudinal. Similar al crol.'),
  ('backstroke', 'Patada Dorsal',        135, 175, 140, 170, 'Extensión de rodilla. Patada desde cadera, rodilla casi extendida.'),
  ('backstroke', 'Cabeza Neutra Dorsal', 155, 178, 160, 175, 'Cabeza neutra mirando al techo. Orejas en el agua.'),

  ('breaststroke', 'Apertura de Brazos',          85,  125, 90,  120, 'Apertura bilateral de brazos en fase propulsiva. 90-110° óptimo.'),
  ('breaststroke', 'Flexión de Rodilla (Pechada)', 85,  140, 90,  130, 'Recuperación de piernas en pechada. Rodillas no más anchas que caderas.'),
  ('breaststroke', 'Dorsiflexión Tobillo',         75,  105, 80,  100, 'Dorsiflexión máxima para superficie de propulsión en patada de rana.'),
  ('breaststroke', 'Ángulo de Tirón',              75,  115, 80,  110, 'Flexión de codo en fase propulsiva de pecho.'),
  ('breaststroke', 'Elevación de Cabeza',          150, 175, 155, 170, 'Mínima extensión de cuello para inspirar. No prolongada.'),

  ('butterfly', 'Entrada Mariposa',    130, 160, 135, 155, 'Entrada bilateral de manos en línea con los hombros.'),
  ('butterfly', 'Codo Alto Mariposa',  65,  110, 70,  100, 'EVF bilateral. Codo elevado para maximizar empuje.'),
  ('butterfly', 'Undulación Cadera',   150, 178, 155, 175, 'Amplitud de onda: mínima en lumbar, máxima en cadera y rodillas.'),
  ('butterfly', 'Patada Delfín',       130, 170, 135, 165, '2 patadas por ciclo. Extensión en rodilla con origen en cadera.'),
  ('butterfly', 'Recuperación Aérea',  95,  145, 100, 140, 'Brazos rasantes al agua en recuperación. Codos semi-extendidos.')
ON CONFLICT DO NOTHING;
