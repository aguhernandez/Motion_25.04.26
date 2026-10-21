import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SwimmingAnalysis from '../src/components/swimming/SwimmingAnalysis';
import WeightliftingAnalysis from '../src/components/weightlifting/WeightliftingAnalysis';
import BodyAngleSelector from '../src/components/shared/BodyAngleSelector';
import VideoCanvas from '../src/components/shared/VideoCanvas';
import type { BiomechanicsSession, BiomechanicsSnapshot } from '../src/lib/types';

const session = (type: 'swimming' | 'weightlifting'): BiomechanicsSession => ({ id: 'test', athlete_id: null, session_type: type, discipline: type === 'swimming' ? 'freestyle' : 'snatch', title: 'Test', notes: '', lab_session_id: '', snapshot_count: 0, created_at: '', updated_at: '' });
const text = (node: { children: unknown[] }): string => node.children.map((child) => typeof child === 'string' ? child : child && typeof child === 'object' && 'children' in child ? text(child as { children: unknown[] }) : '').join('');

describe('body-region selection in swimming and weightlifting', () => {
  let view: ReturnType<typeof create>;
  beforeEach(() => {
    vi.stubGlobal('Image', class { src = ''; });
    vi.stubGlobal('document', { createElement: () => ({}) });
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  });
  afterEach(() => { if (view) act(() => view.unmount()); vi.unstubAllGlobals(); });
  const render = (sport: 'swimming' | 'weightlifting', snapshots: BiomechanicsSnapshot[] = []) => {
    const save = vi.fn(async () => {});
    const props = { sessions: [], activeSession: session(sport), references: [], snapshots, onNewSession: () => {}, onSaveSnapshot: save, onSelectSession: () => {} };
    act(() => { view = create(sport === 'swimming' ? <SwimmingAnalysis {...props} athletes={[]} /> : <WeightliftingAnalysis {...props} />); });
    return save;
  };
  const chooseLegs = () => {
    const selector = view.root.findByType(BodyAngleSelector);
    const button = selector.findAllByType('button').find((button) => text(button).includes('Piernas'))!;
    act(() => button.props.onClick());
  };
  it.each(['swimming', 'weightlifting'] as const)('%s starts without unwanted markers and filters stored snapshots', async (sport) => {
    const save = render(sport);
    expect(view.root.findByType(VideoCanvas).props.keyPoints).toEqual([]);
    chooseLegs();
    const canvas = view.root.findByType(VideoCanvas);
    expect(canvas.props.keyPoints.length).toBeGreaterThan(0);
    expect(canvas.props.keyPoints.some((point: { id: string }) => /head|neck|elbow|wrist/.test(point.id))).toBe(false);
    expect(canvas.props.angles.every((angle: { point_ids: string[] }) => angle.point_ids.every((label) => canvas.props.keyPoints.some((point: { label: string }) => point.label === label)))).toBe(true);
    const saveButton = view.root.findAllByType('button').find((button) => text(button).includes('Guardar snapshot'))!;
    await act(async () => { await saveButton.props.onClick(); });
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ key_points: canvas.props.keyPoints, angles: canvas.props.angles }));
  });
  it.each(['swimming', 'weightlifting'] as const)('%s preserves hidden point positions while angles are toggled', (sport) => {
    render(sport); chooseLegs();
    const initial = view.root.findByType(VideoCanvas).props.keyPoints;
    const changed = initial.map((point: { id: string; x: number }) => point.id.startsWith('knee') ? { ...point, x: 0.72 } : point);
    act(() => view.root.findByType(VideoCanvas).props.onPointsChange(changed));
    chooseLegs();
    expect(view.root.findByType(VideoCanvas).props.keyPoints).toEqual([]);
    chooseLegs();
    expect(view.root.findByType(VideoCanvas).props.keyPoints.find((point: { id: string }) => point.id.startsWith('knee')).x).toBe(0.72);
  });
  it.each(['swimming', 'weightlifting'] as const)('%s restores the saved selection and can add other regions afterward', (sport) => {
    render(sport); chooseLegs();
    const canvas = view.root.findByType(VideoCanvas);
    const snapshot: BiomechanicsSnapshot = { id: 'saved', session_id: 'test', image_data: 'data:image/png;base64,test', key_points: canvas.props.keyPoints, angles: canvas.props.angles, bike_fitting_data: {}, gait_data: {}, phase_label: sport === 'swimming' ? '[Crol] Entrada' : '[Arranque] Posición inicial', notes: '', created_at: '' };
    act(() => view.unmount());
    render(sport, [snapshot]);
    const thumbnail = view.root.findAllByType('button').find((button) => button.findAllByType('img').length === 1)!;
    act(() => thumbnail.props.onClick());
    expect(view.root.findByType(VideoCanvas).props.keyPoints).toEqual(snapshot.key_points);
    const selector = view.root.findByType(BodyAngleSelector);
    const arms = selector.findAllByType('button').find((button) => text(button).includes('Brazos'))!;
    act(() => arms.props.onClick());
    expect(view.root.findByType(VideoCanvas).props.keyPoints.some((point: { id: string }) => point.id === 'elbow')).toBe(true);
  });
  it.each([
    ['swimming', ['Crol', 'Espalda', 'Pecho', 'Mariposa']],
    ['weightlifting', ['Arranque', 'Clin y Envión', 'S. Trasera', 'S. Frontal', 'Peso Muerto', 'Press Hombros', 'Press Banca', 'Power Clean']],
  ] as const)('offers individual angles and region controls for every %s preset', (sport, tabs) => {
    render(sport);
    for (const label of tabs) {
      const tab = view.root.findAllByType('button').find((button) => text(button).trim() === label);
      expect(tab, `Missing sport tab: ${label}`).toBeDefined();
      act(() => tab!.props.onClick());
      const selector = view.root.findByType(BodyAngleSelector);
      const configs = selector.props.angleConfigs;
      const points = selector.props.defaultPoints;
      expect(selector.findAllByType('button')).toHaveLength(4);
      expect(selector.findAllByType('input')).toHaveLength(configs.length);
      for (const config of configs) for (const key of ['labelP1', 'labelVertex', 'labelP2']) expect(points.some((point: { label: string }) => point.label === config[key])).toBe(true);
      expect(view.root.findByType(VideoCanvas).props.keyPoints).toEqual([]);
    }
  });
});
