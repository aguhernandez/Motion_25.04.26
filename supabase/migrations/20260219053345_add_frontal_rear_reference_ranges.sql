/*
  # Add Reference Ranges for Frontal Cycling and Posterior Running Views

  ## Summary
  Inserts reference range records for the new biomechanical analysis views:
  - Cycling frontal view: bilateral knee valgo/varo, pelvic tilt, shoulder symmetry
  - Running posterior view: lateral hip bilateral, trunk posterior tilt, bilateral posterior knee
*/

INSERT INTO reference_ranges (discipline, angle_name, min_deg, max_deg, optimal_min_deg, optimal_max_deg, description)
VALUES
  ('road',         'Rodilla Der. Valgo/Varo',   165, 185, 170, 180, 'Alineación frontal rodilla derecha. Valores bajos indican valgo.'),
  ('road',         'Rodilla Izq. Valgo/Varo',   165, 185, 170, 180, 'Alineación frontal rodilla izquierda. Valores bajos indican valgo.'),
  ('road',         'Inclinación Pelvis',         155, 185, 160, 180, 'Inclinación lateral de pelvis en vista frontal.'),
  ('road',         'Simetría Hombros',           150, 180, 155, 175, 'Simetría bilateral de hombros en vista frontal.'),
  ('road_running', 'Cadera Lateral Der.',        155, 185, 160, 180, 'Ángulo lateral de cadera derecha en vista posterior. Hip drop si < 155°.'),
  ('road_running', 'Cadera Lateral Izq.',        155, 185, 160, 180, 'Ángulo lateral de cadera izquierda en vista posterior. Hip drop si < 155°.'),
  ('road_running', 'Inclinación Tronco Post.',   155, 185, 160, 180, 'Inclinación lateral del tronco en vista posterior.'),
  ('road_running', 'Rodilla Der. Posterior',     155, 180, 160, 175, 'Flexión de rodilla derecha en apoyo, vista posterior.'),
  ('road_running', 'Rodilla Izq. Posterior',     155, 180, 160, 175, 'Flexión de rodilla izquierda en apoyo, vista posterior.')
ON CONFLICT DO NOTHING;
