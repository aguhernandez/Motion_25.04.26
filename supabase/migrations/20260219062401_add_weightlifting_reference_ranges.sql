/*
  # Add Weightlifting Reference Ranges

  ## Overview
  Inserts scientific reference ranges for 8 weightlifting/strength disciplines into the reference_ranges table.

  ## Disciplines Covered
  1. snatch — Olympic lift (Arranque)
  2. clean_jerk — Olympic lift (Clin y Envión)
  3. power_clean — Olympic derivative
  4. back_squat — Powerlifting/general strength
  5. front_squat — Olympic assistance
  6. deadlift — Powerlifting (Peso Muerto)
  7. overhead_press — Pressing (OHP)
  8. bench_press — Powerlifting pressing

  ## Columns Used
  - discipline: identifies specific lift
  - angle_name: descriptive name of the angle
  - min_deg / max_deg: total allowable range
  - optimal_min_deg / optimal_max_deg: recommended optimal range
  - description: scientific notes and citations

  ## Sources
  - Garhammer (1980, 1993)
  - Escamilla et al. (2000, 2001)
  - Hanen et al. (2025)
  - Comfort et al. (2011)
  - Stone et al. (1998)
  - Storey & Smith (2012)
  - Khuyagbaatar et al. (2024)

  ## Notes
  - Uses ON CONFLICT DO NOTHING to avoid duplicate errors
  - is_custom = false for all scientifically-derived entries
*/

INSERT INTO reference_ranges (discipline, angle_name, min_deg, max_deg, optimal_min_deg, optimal_max_deg, description, is_custom)
VALUES

-- SNATCH (Arranque)
('snatch', 'Rodilla (Arranque)', 40, 110, 50, 80,
 'Ángulo de rodilla en la posición de inicio. Rango óptimo 50–80° permite tracción eficiente. Garhammer 1993; Hanen et al. 2025', false),
('snatch', 'Cadera (Arranque)', 40, 90, 50, 75,
 'Ángulo de cadera al inicio. Debe ser similar al de rodilla para carga equilibrada. Garhammer 1993', false),
('snatch', 'Tronco (Arranque)', 20, 60, 25, 45,
 'Inclinación del tronco al inicio respecto a vertical. Menor inclinación mejora trayectoria de barra. Hanen et al. 2025', false),
('snatch', 'Cadera (2da tracción)', 160, 185, 170, 180,
 'Extensión de cadera en la 2ª tracción — triple extensión explosiva. Debe acercarse a 180°. Garhammer 1980', false),
('snatch', 'Rodilla (recepción)', 75, 120, 85, 105,
 'Ángulo de rodilla en la recepción (squat snatch). Afecta estabilidad y potencia absorbida. Khuyagbaatar et al. 2024', false),

-- CLEAN & JERK (Clin y Envión)
('clean_jerk', 'Rodilla (Clin)', 40, 110, 50, 80,
 'Ángulo de rodilla en la posición inicial del clin. Garhammer 1993', false),
('clean_jerk', 'Cadera (Clin)', 40, 90, 50, 75,
 'Ángulo de cadera en la posición inicial. Garhammer 1993', false),
('clean_jerk', 'Codo (rack position)', 45, 90, 55, 75,
 'Ángulo de codo en la posición de rack. EVA (Early Vertical Forearm) indica buen recibimiento. Stone et al. 1998', false),
('clean_jerk', 'Rodilla (Jerk dip)', 110, 155, 120, 145,
 'Extensión de rodilla en el dip del jerk. Profundidad correcta permite transferencia de potencia. Garhammer 1993', false),
('clean_jerk', 'Hombro (recepción)', 155, 185, 165, 180,
 'Ángulo de hombro en recepción del jerk: brazos extendidos overhead. Stone et al. 1998', false),

-- POWER CLEAN
('power_clean', 'Rodilla (Power Clean)', 40, 110, 50, 80,
 'Ángulo de rodilla inicial en power clean. Comfort et al. 2011', false),
('power_clean', 'Cadera (Power Clean)', 40, 90, 50, 75,
 'Ángulo de cadera inicial. Comfort et al. 2011', false),
('power_clean', 'Codo (rack power clean)', 50, 95, 60, 80,
 'Ángulo de codo en rack. Comfort et al. 2011', false),
('power_clean', 'Tronco (Power Clean)', 20, 60, 25, 45,
 'Inclinación del tronco al inicio. Comfort et al. 2011', false),
('power_clean', 'Cadera (2da tracción PC)', 160, 185, 170, 180,
 'Extensión de cadera en 2ª tracción. Comfort et al. 2011', false),

-- BACK SQUAT (Sentadilla Trasera)
('back_squat', 'Rodilla (Back Squat)', 80, 140, 90, 110,
 'Ángulo de rodilla en el punto más bajo (paralelo o por debajo). ≥90° indica profundidad paralela. Escamilla et al. 2001', false),
('back_squat', 'Cadera (Back Squat)', 50, 120, 70, 100,
 'Flexión de cadera en la fase baja. Mayor cierre indica mayor profundidad. Escamilla et al. 2001', false),
('back_squat', 'Tronco (Back Squat)', 130, 175, 140, 170,
 'Ángulo de tronco relativo a vertical. Mayor ángulo = tronco más erguido. Escamilla et al. 2001', false),
('back_squat', 'Tobillo (Back Squat)', 60, 90, 65, 80,
 'Dorsiflexión de tobillo. Restricción limita profundidad. Escamilla et al. 2001', false),

-- FRONT SQUAT (Sentadilla Frontal)
('front_squat', 'Rodilla (Front Squat)', 80, 140, 90, 110,
 'Ángulo de rodilla en punto más bajo. Similar al back squat pero mayor demanda de tobillo. Escamilla et al. 2001', false),
('front_squat', 'Cadera (Front Squat)', 50, 120, 70, 100,
 'Flexión de cadera. Escamilla et al. 2001', false),
('front_squat', 'Tronco (Front Squat)', 140, 185, 155, 180,
 'Tronco más erguido que en back squat por la posición de la barra. Escamilla et al. 2001', false),
('front_squat', 'Tobillo (Front Squat)', 55, 90, 60, 78,
 'Mayor demanda de dorsiflexión que en back squat. Escamilla et al. 2001', false),

-- DEADLIFT (Peso Muerto)
('deadlift', 'Rodilla (Peso Muerto)', 100, 165, 115, 145,
 'Ángulo de rodilla al inicio del peso muerto convencional. Escamilla et al. 2000', false),
('deadlift', 'Cadera (Peso Muerto)', 40, 100, 55, 80,
 'Flexión de cadera al inicio. Escamilla et al. 2000', false),
('deadlift', 'Tronco (Peso Muerto)', 100, 165, 120, 145,
 'Ángulo de tronco. Valores <120° aumentan el momento lumbar. Escamilla et al. 2000', false),
('deadlift', 'Rodilla (lockout)', 170, 185, 175, 182,
 'Extensión final de rodilla. Hiper-extensión debe evitarse. Escamilla et al. 2000', false),

-- OVERHEAD PRESS (Press de Hombros)
('overhead_press', 'Codo (OHP inicio)', 75, 110, 85, 100,
 'Ángulo de codo en posición inicial de la barra. Stone et al. 1998', false),
('overhead_press', 'Hombro (OHP lockout)', 155, 185, 165, 180,
 'Ángulo de hombro al final del press — brazos extendidos. Stone et al. 1998', false),
('overhead_press', 'Tronco (OHP)', 155, 185, 165, 180,
 'Inclinación mínima del tronco — debe permanecer neutro/erguido. Stone et al. 1998', false),

-- BENCH PRESS (Press de Banca)
('bench_press', 'Codo (Bench Press descenso)', 75, 115, 85, 100,
 'Ángulo de codo al tocar el pecho. Storey & Smith 2012', false),
('bench_press', 'Hombro (Bench Press)', 35, 75, 45, 65,
 'Abducción de hombro respecto al tronco. >75° aumenta riesgo pectoral. Storey & Smith 2012', false),
('bench_press', 'Codo (Bench Press lockout)', 160, 185, 170, 180,
 'Extensión final del codo. Extensión completa recomendada en powerlifting. Storey & Smith 2012', false)

ON CONFLICT DO NOTHING;
