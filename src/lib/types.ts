export type SessionType = 'cycling' | 'running' | 'swimming' | 'weightlifting' | 'custom';
export type Discipline = 'road' | 'mtb' | 'trail_run' | 'track' | 'road_running' | 'triathlon' | 'freestyle' | 'backstroke' | 'breaststroke' | 'butterfly' | 'snatch' | 'clean_jerk' | 'back_squat' | 'front_squat' | 'deadlift' | 'overhead_press' | 'bench_press' | 'power_clean' | 'custom';

export interface Athlete {
  id: string;
  name: string;
  email: string;
  date_of_birth: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  leg_length_cm: number | null;
  arm_length_cm: number | null;
  shoulder_width_cm: number | null;
  torso_length_cm: number | null;
  inseam_cm: number | null;
  lab_athlete_id: string;
  notes: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

export interface BiomechanicsSession {
  id: string;
  athlete_id: string | null;
  session_type: SessionType;
  discipline: Discipline;
  title: string;
  notes: string;
  lab_session_id: string;
  snapshot_count: number;
  created_at: string;
  updated_at: string;
  athlete?: Athlete;
}

export interface KeyPoint {
  id: string;
  label: string;
  x: number;
  y: number;
  color?: string;
}

export interface CustomAngleConfig {
  id: string;
  name: string;
  labelP1: string;
  labelVertex: string;
  labelP2: string;
}

export interface AngleData {
  name: string;
  value_deg: number;
  reference_min: number;
  reference_max: number;
  optimal_min: number;
  optimal_max: number;
  status: 'optimal' | 'acceptable' | 'warning' | 'critical';
  point_ids: string[];
}

export interface BikeFittingData {
  saddle_height_mm?: number;
  saddle_setback_mm?: number;
  reach_mm?: number;
  stack_mm?: number;
  drop_mm?: number;
  cadence_rpm?: number;
  handlebar_drop?: number;
}

export interface GaitData {
  cadence_spm?: number;
  stride_length_cm?: number;
  contact_time_ms?: number;
  flight_time_ms?: number;
  vertical_oscillation_cm?: number;
  foot_strike?: 'heel' | 'midfoot' | 'forefoot' | null;
}

export interface BiomechanicsSnapshot {
  id: string;
  session_id: string;
  image_data: string;
  key_points: KeyPoint[];
  angles: AngleData[];
  bike_fitting_data: BikeFittingData;
  gait_data: GaitData;
  phase_label: string;
  notes: string;
  created_at: string;
}

export interface ReferenceRange {
  id: string;
  discipline: string;
  angle_name: string;
  min_deg: number;
  optimal_min_deg: number;
  optimal_max_deg: number;
  max_deg: number;
  description: string;
  is_custom: boolean;
  created_by: string;
  created_at: string;
}

export type ActiveView =
  | 'dashboard'
  | 'cycling-analysis'
  | 'running-analysis'
  | 'swimming-analysis'
  | 'weightlifting-analysis'
  | 'custom-analysis'
  | 'aerodynamics'
  | 'sessions'
  | 'athletes'
  | 'references'
  | 'reports'
  | 'settings';
