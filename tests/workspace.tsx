import React from 'react';
import { fixture } from './videoFixture';
import { createRoot } from 'react-dom/client';
import AnalysisWorkspace from '../src/components/shared/AnalysisWorkspace';
import { RUNNING_KEY_POINTS, RUNNING_POINT_CONNECTIONS } from '../src/data/defaultKeyPoints';
import { RUNNING_ANGLE_CONFIGS } from '../src/lib/angleCalculations';
import type { BiomechanicsSession } from '../src/lib/types';
import '../src/index.css';

const session: BiomechanicsSession = { id: 'test', athlete_id: null, session_type: 'running', discipline: 'road_running', title: 'Prueba de seguimiento', notes: '', lab_session_id: '', snapshot_count: 0, created_at: '', updated_at: '' };
createRoot(document.getElementById('root')!).render(<div className="p-4"><button className="mb-4 p-3 bg-white rounded" onClick={async () => {
  const file = await fixture(240);
  const input = document.querySelector<HTMLInputElement>('input[type="file"][accept^="video"]')!;
  const transfer = new DataTransfer(); transfer.items.add(file); input.files = transfer.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}}>Cargar video sintético de 240 FPS</button><AnalysisWorkspace session={session} defaultPoints={RUNNING_KEY_POINTS} connections={RUNNING_POINT_CONNECTIONS} angleConfigs={RUNNING_ANGLE_CONFIGS} references={[]} snapshots={[]} onSaveSnapshot={async () => { /* No remote writes in this test workspace. */ }} /></div>);
