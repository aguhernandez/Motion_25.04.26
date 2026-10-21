import { describe, expect, it } from 'vitest';
import { adjacentFrameTime, describeFrameRate, frameIndexAtTime, sampleFrameTimes, trackingCsv, truncateSamples } from '../src/lib/videoTracking';
import { computeAnglesFromPoints } from '../src/lib/angleCalculations';
import type { TrackingSample } from '../src/lib/videoTracking';

const times = (fps: number, seconds = 1) => Array.from({ length: Math.round(fps * seconds) }, (_, i) => i / fps);
const sample = (time: number): TrackingSample => ({ time, points: [{ id: 'knee', label: 'Rodilla', x: 0.5, y: 0.25 }], angles: [], lostIds: [], confidence: { knee: 0.9 } });

describe('actual source frame sampling', () => {
  it.each([24, 25, 29.97, 30, 50, 59.94, 60])('keeps every frame at %s FPS with a 60 FPS limit', (fps) => {
    const source = times(fps);
    expect(sampleFrameTimes(source, 60)).toEqual(source);
  });
  it.each([60, 120])('samples 240 FPS down to %s without synthetic timestamps', (limit) => {
    const source = times(240);
    const selected = sampleFrameTimes(source, limit);
    expect(selected).toHaveLength(limit);
    expect(selected).toEqual(source.filter((_, i) => i % (240 / limit) === 0));
    expect(new Set(selected).size).toBe(selected.length);
  });
  it('keeps all 120 FPS source frames at 120 and halves them at 60', () => {
    expect(sampleFrameTimes(times(120), 120)).toHaveLength(120);
    expect(sampleFrameTimes(times(120), 60)).toHaveLength(60);
  });
  it('handles non-divisible and variable rates by actual presentation time', () => {
    const source = [0, 0.003, 0.0087, 0.011, 0.018, 0.023, 0.028, 0.04, 0.1];
    expect(sampleFrameTimes(source, 120)).toEqual([0, 0.0087, 0.018, 0.028, 0.04, 0.1]);
    expect(describeFrameRate(source).variableFrameRate).toBe(true);
  });
  it('starts on the displayed source frame and does not re-analyze the earlier segment', () => {
    expect(sampleFrameTimes(times(30), 120, 0.112)[0]).toBe(0.1);
    expect(truncateSamples([sample(0), sample(0.1), sample(0.2)], 0.1)).toEqual([sample(0)]);
  });
  it('navigates actual timestamps at fractional and variable FPS', () => {
    const source = [0, 0.007, 0.015, 0.05];
    expect(adjacentFrameTime(source, 0.007, 1)).toBe(0.015);
    expect(adjacentFrameTime(source, 0.015, -1)).toBe(0.007);
    expect(adjacentFrameTime(source, 0, -1)).toBe(0);
    expect(adjacentFrameTime(source, 1, 1)).toBe(0.05);
    expect(frameIndexAtTime(source, 0.049)).toBe(2);
    expect(frameIndexAtTime([], 0)).toBe(-1);
  });
  it('does not infer frames in the gaps or increase FPS', () => {
    expect(sampleFrameTimes([0, 0.1, 2], 120)).toEqual([0, 0.1, 2]);
    expect(sampleFrameTimes([], 120)).toEqual([]);
    expect(describeFrameRate(times(240)).sourceFps).toBeCloseTo(240);
  });
});

describe('measurements and exports', () => {
  it('calculates angles in image pixels rather than distorted normalized coordinates', () => {
    const points = [{ id: 'a', label: 'a', x: 0.7, y: 0.1 }, { id: 'v', label: 'v', x: 0.5, y: 0.5 }, { id: 'b', label: 'b', x: 0.9, y: 0.5 }];
    const config = [{ name: 'test', labelP1: 'a', labelVertex: 'v', labelP2: 'b' }];
    expect(computeAnglesFromPoints(points, config, [], { width: 1920, height: 1080 })[0].value_deg).toBe(48);
  });
  it('exports timestamps, normalized positions and pixel positions', () => {
    const csv = trackingCsv([sample(1 / 120)], 1920, 1080);
    expect(csv).toContain('"960","270"');
    expect(csv).toContain('"8.333333333333334"');
  });
  it('marks lost positions and prevents unsafe spreadsheet labels', () => {
    const value = sample(0);
    value.points[0].label = '=CMD("test")';
    value.lostIds = ['knee'];
    const csv = trackingCsv([value], 1920, 1080);
    expect(csv).toContain("'=CMD");
    expect(csv).toContain('"lost"');
    expect(csv).not.toContain('"960"');
  });
});
