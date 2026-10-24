import type { KeyPoint } from '../lib/types';

export const CYCLING_KEY_POINTS: KeyPoint[] = [
  { id: 'hip', label: 'Cadera', x: 0.45, y: 0.35, color: '#ef4444' },
  { id: 'knee', label: 'Rodilla', x: 0.42, y: 0.55, color: '#f59e0b' },
  { id: 'ankle', label: 'Tobillo', x: 0.44, y: 0.72, color: '#10b981' },
  { id: 'metatarsus', label: 'Metatarso', x: 0.47, y: 0.80, color: '#06b6d4' },
  { id: 'shoulder', label: 'Hombro', x: 0.38, y: 0.22, color: '#8b5cf6' },
  { id: 'elbow', label: 'Codo', x: 0.30, y: 0.32, color: '#ec4899' },
  { id: 'wrist', label: 'Muñeca', x: 0.25, y: 0.40, color: '#f97316' },
  { id: 'neck', label: 'Cuello', x: 0.40, y: 0.15, color: '#3b82f6' },
];

export const RUNNING_KEY_POINTS: KeyPoint[] = [
  { id: 'hip', label: 'Cadera', x: 0.50, y: 0.40, color: '#ef4444' },
  { id: 'knee', label: 'Rodilla', x: 0.50, y: 0.58, color: '#f59e0b' },
  { id: 'ankle', label: 'Tobillo', x: 0.50, y: 0.74, color: '#10b981' },
  { id: 'metatarsus', label: 'Metatarso', x: 0.52, y: 0.83, color: '#06b6d4' },
  { id: 'shoulder', label: 'Hombro', x: 0.44, y: 0.26, color: '#8b5cf6' },
  { id: 'elbow', label: 'Codo', x: 0.36, y: 0.36, color: '#ec4899' },
  { id: 'neck', label: 'Cuello', x: 0.48, y: 0.18, color: '#3b82f6' },
  { id: 'head', label: 'Cabeza', x: 0.48, y: 0.10, color: '#0ea5e9' },
];

export const CYCLING_POINT_CONNECTIONS: [string, string][] = [
  ['Cuello', 'Hombro'],
  ['Hombro', 'Codo'],
  ['Codo', 'Muñeca'],
  ['Hombro', 'Cadera'],
  ['Cadera', 'Rodilla'],
  ['Rodilla', 'Tobillo'],
  ['Tobillo', 'Metatarso'],
];

export const RUNNING_POINT_CONNECTIONS: [string, string][] = [
  ['Cabeza', 'Cuello'],
  ['Cuello', 'Hombro'],
  ['Hombro', 'Codo'],
  ['Hombro', 'Cadera'],
  ['Cadera', 'Rodilla'],
  ['Rodilla', 'Tobillo'],
  ['Tobillo', 'Metatarso'],
];

export const CYCLING_FRONTAL_KEY_POINTS: KeyPoint[] = [
  { id: 'shoulder_r', label: 'Hombro Der.', x: 0.38, y: 0.22, color: '#8b5cf6' },
  { id: 'shoulder_l', label: 'Hombro Izq.', x: 0.62, y: 0.22, color: '#ec4899' },
  { id: 'neck',       label: 'Cuello',       x: 0.50, y: 0.17, color: '#3b82f6' },
  { id: 'hip_r',      label: 'Cadera Der.',  x: 0.42, y: 0.40, color: '#ef4444' },
  { id: 'hip_l',      label: 'Cadera Izq.',  x: 0.58, y: 0.40, color: '#f97316' },
  { id: 'knee_r',     label: 'Rodilla Der.', x: 0.40, y: 0.58, color: '#f59e0b' },
  { id: 'knee_l',     label: 'Rodilla Izq.', x: 0.60, y: 0.58, color: '#eab308' },
  { id: 'ankle_r',    label: 'Tobillo Der.', x: 0.41, y: 0.75, color: '#10b981' },
  { id: 'ankle_l',    label: 'Tobillo Izq.', x: 0.59, y: 0.75, color: '#06b6d4' },
];

export const CYCLING_FRONTAL_POINT_CONNECTIONS: [string, string][] = [
  ['Hombro Der.', 'Cuello'],
  ['Hombro Izq.', 'Cuello'],
  ['Hombro Der.', 'Cadera Der.'],
  ['Hombro Izq.', 'Cadera Izq.'],
  ['Cadera Der.', 'Cadera Izq.'],
  ['Cadera Der.', 'Rodilla Der.'],
  ['Cadera Izq.', 'Rodilla Izq.'],
  ['Rodilla Der.', 'Tobillo Der.'],
  ['Rodilla Izq.', 'Tobillo Izq.'],
];

export const RUNNING_REAR_KEY_POINTS: KeyPoint[] = [
  { id: 'shoulder_r', label: 'Hombro Der.', x: 0.38, y: 0.24, color: '#8b5cf6' },
  { id: 'shoulder_l', label: 'Hombro Izq.', x: 0.62, y: 0.24, color: '#ec4899' },
  { id: 'hip_r',      label: 'Cadera Der.',  x: 0.43, y: 0.42, color: '#ef4444' },
  { id: 'hip_l',      label: 'Cadera Izq.',  x: 0.57, y: 0.42, color: '#f97316' },
  { id: 'knee_r',     label: 'Rodilla Der.', x: 0.42, y: 0.60, color: '#f59e0b' },
  { id: 'knee_l',     label: 'Rodilla Izq.', x: 0.58, y: 0.60, color: '#eab308' },
  { id: 'ankle_r',    label: 'Tobillo Der.', x: 0.43, y: 0.76, color: '#10b981' },
  { id: 'ankle_l',    label: 'Tobillo Izq.', x: 0.57, y: 0.76, color: '#06b6d4' },
  { id: 'heel_r',     label: 'Talón Der.',   x: 0.42, y: 0.84, color: '#0ea5e9' },
  { id: 'heel_l',     label: 'Talón Izq.',   x: 0.58, y: 0.84, color: '#6366f1' },
];

export const RUNNING_REAR_POINT_CONNECTIONS: [string, string][] = [
  ['Hombro Der.', 'Hombro Izq.'],
  ['Hombro Der.', 'Cadera Der.'],
  ['Hombro Izq.', 'Cadera Izq.'],
  ['Cadera Der.', 'Cadera Izq.'],
  ['Cadera Der.', 'Rodilla Der.'],
  ['Cadera Izq.', 'Rodilla Izq.'],
  ['Rodilla Der.', 'Tobillo Der.'],
  ['Rodilla Izq.', 'Tobillo Izq.'],
  ['Tobillo Der.', 'Talón Der.'],
  ['Tobillo Izq.', 'Talón Izq.'],
];

export const SWIMMING_FREESTYLE_KEY_POINTS: KeyPoint[] = [
  { id: 'head',       label: 'Cabeza',      x: 0.88, y: 0.44, color: '#0ea5e9' },
  { id: 'neck',       label: 'Cuello',      x: 0.80, y: 0.42, color: '#3b82f6' },
  { id: 'shoulder',   label: 'Hombro',      x: 0.68, y: 0.40, color: '#8b5cf6' },
  { id: 'shoulder_r', label: 'Hombro Der.', x: 0.68, y: 0.36, color: '#a78bfa' },
  { id: 'shoulder_l', label: 'Hombro Izq.', x: 0.68, y: 0.44, color: '#c4b5fd' },
  { id: 'elbow',      label: 'Codo',        x: 0.55, y: 0.35, color: '#ec4899' },
  { id: 'wrist',      label: 'Muñeca',      x: 0.42, y: 0.30, color: '#f97316' },
  { id: 'hand',       label: 'Mano',        x: 0.33, y: 0.28, color: '#fbbf24' },
  { id: 'hip',        label: 'Cadera',      x: 0.48, y: 0.50, color: '#ef4444' },
  { id: 'knee',       label: 'Rodilla',     x: 0.32, y: 0.55, color: '#f59e0b' },
  { id: 'ankle',      label: 'Tobillo',     x: 0.18, y: 0.58, color: '#10b981' },
  { id: 'foot',       label: 'Pie',         x: 0.10, y: 0.60, color: '#06b6d4' },
];

export const SWIMMING_FREESTYLE_CONNECTIONS: [string, string][] = [
  ['Cabeza', 'Cuello'],
  ['Cuello', 'Hombro'],
  ['Hombro Der.', 'Hombro Izq.'],
  ['Hombro', 'Codo'],
  ['Codo', 'Muñeca'],
  ['Muñeca', 'Mano'],
  ['Hombro', 'Cadera'],
  ['Cadera', 'Rodilla'],
  ['Rodilla', 'Tobillo'],
  ['Tobillo', 'Pie'],
];

export const SWIMMING_BREASTSTROKE_KEY_POINTS: KeyPoint[] = [
  { id: 'shoulder', label: 'Hombro', x: 0.50, y: 0.33, color: '#8b5cf6' },
  { id: 'head',       label: 'Cabeza',      x: 0.50, y: 0.22, color: '#0ea5e9' },
  { id: 'neck',       label: 'Cuello',      x: 0.50, y: 0.30, color: '#3b82f6' },
  { id: 'shoulder_r', label: 'Hombro Der.', x: 0.38, y: 0.33, color: '#8b5cf6' },
  { id: 'shoulder_l', label: 'Hombro Izq.', x: 0.62, y: 0.33, color: '#a78bfa' },
  { id: 'elbow_r',    label: 'Codo Der.',   x: 0.28, y: 0.37, color: '#ec4899' },
  { id: 'elbow_l',    label: 'Codo Izq.',   x: 0.72, y: 0.37, color: '#f97316' },
  { id: 'wrist_r',    label: 'Muñeca Der.', x: 0.22, y: 0.38, color: '#fbbf24' },
  { id: 'wrist_l',    label: 'Muñeca Izq.', x: 0.78, y: 0.38, color: '#fb923c' },
  { id: 'hip',        label: 'Cadera',      x: 0.50, y: 0.54, color: '#ef4444' },
  { id: 'knee_r',     label: 'Rodilla',     x: 0.50, y: 0.68, color: '#f59e0b' },
  { id: 'ankle',      label: 'Tobillo',     x: 0.50, y: 0.80, color: '#10b981' },
  { id: 'foot',       label: 'Pie',         x: 0.50, y: 0.88, color: '#06b6d4' },
];

export const SWIMMING_BREASTSTROKE_CONNECTIONS: [string, string][] = [
  ['Cuello', 'Hombro'],
  ['Cabeza', 'Cuello'],
  ['Cuello', 'Hombro Der.'],
  ['Cuello', 'Hombro Izq.'],
  ['Hombro Der.', 'Codo Der.'],
  ['Hombro Izq.', 'Codo Izq.'],
  ['Codo Der.', 'Muñeca Der.'],
  ['Codo Izq.', 'Muñeca Izq.'],
  ['Hombro Der.', 'Cadera'],
  ['Hombro Izq.', 'Cadera'],
  ['Cadera', 'Rodilla'],
  ['Rodilla', 'Tobillo'],
  ['Tobillo', 'Pie'],
];

export const WEIGHTLIFTING_OLYMPIC_KEY_POINTS: KeyPoint[] = [
  { id: 'head',       label: 'Cabeza',    x: 0.52, y: 0.08, color: '#0ea5e9' },
  { id: 'neck',       label: 'Cuello',    x: 0.52, y: 0.15, color: '#3b82f6' },
  { id: 'shoulder',   label: 'Hombro',    x: 0.46, y: 0.22, color: '#8b5cf6' },
  { id: 'elbow',      label: 'Codo',      x: 0.38, y: 0.28, color: '#ec4899' },
  { id: 'wrist',      label: 'Muñeca',    x: 0.32, y: 0.36, color: '#f97316' },
  { id: 'hip',        label: 'Cadera',    x: 0.50, y: 0.40, color: '#ef4444' },
  { id: 'knee',       label: 'Rodilla',   x: 0.48, y: 0.60, color: '#f59e0b' },
  { id: 'ankle',      label: 'Tobillo',   x: 0.50, y: 0.78, color: '#10b981' },
  { id: 'metatarsus', label: 'Metatarso', x: 0.52, y: 0.87, color: '#06b6d4' },
];

export const WEIGHTLIFTING_OLYMPIC_CONNECTIONS: [string, string][] = [
  ['Cabeza', 'Cuello'],
  ['Cuello', 'Hombro'],
  ['Hombro', 'Codo'],
  ['Codo', 'Muñeca'],
  ['Hombro', 'Cadera'],
  ['Cadera', 'Rodilla'],
  ['Rodilla', 'Tobillo'],
  ['Tobillo', 'Metatarso'],
];

export const WEIGHTLIFTING_SQUAT_KEY_POINTS: KeyPoint[] = [
  { id: 'head',       label: 'Cabeza',    x: 0.50, y: 0.08, color: '#0ea5e9' },
  { id: 'neck',       label: 'Cuello',    x: 0.50, y: 0.16, color: '#3b82f6' },
  { id: 'shoulder',   label: 'Hombro',    x: 0.44, y: 0.24, color: '#8b5cf6' },
  { id: 'hip',        label: 'Cadera',    x: 0.48, y: 0.44, color: '#ef4444' },
  { id: 'knee',       label: 'Rodilla',   x: 0.46, y: 0.62, color: '#f59e0b' },
  { id: 'ankle',      label: 'Tobillo',   x: 0.50, y: 0.78, color: '#10b981' },
  { id: 'metatarsus', label: 'Metatarso', x: 0.53, y: 0.86, color: '#06b6d4' },
];

export const WEIGHTLIFTING_SQUAT_CONNECTIONS: [string, string][] = [
  ['Cabeza', 'Cuello'],
  ['Cuello', 'Hombro'],
  ['Hombro', 'Cadera'],
  ['Cadera', 'Rodilla'],
  ['Rodilla', 'Tobillo'],
  ['Tobillo', 'Metatarso'],
];

export const WEIGHTLIFTING_BENCH_KEY_POINTS: KeyPoint[] = [
  { id: 'shoulder',   label: 'Hombro',    x: 0.40, y: 0.38, color: '#8b5cf6' },
  { id: 'elbow',      label: 'Codo',      x: 0.30, y: 0.44, color: '#ec4899' },
  { id: 'wrist',      label: 'Muñeca',    x: 0.22, y: 0.36, color: '#f97316' },
  { id: 'bar',        label: 'Barra',     x: 0.16, y: 0.30, color: '#fbbf24' },
  { id: 'hip',        label: 'Cadera',    x: 0.52, y: 0.45, color: '#ef4444' },
  { id: 'neck',       label: 'Cuello',    x: 0.44, y: 0.30, color: '#3b82f6' },
];

export const WEIGHTLIFTING_BENCH_CONNECTIONS: [string, string][] = [
  ['Cuello', 'Hombro'],
  ['Hombro', 'Codo'],
  ['Codo', 'Muñeca'],
  ['Muñeca', 'Barra'],
  ['Hombro', 'Cadera'],
];
