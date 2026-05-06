import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { BiomechanicsSnapshot } from '../lib/types';

export function useSnapshots(sessionId?: string) {
  const [snapshots, setSnapshots] = useState<BiomechanicsSnapshot[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSnapshots = useCallback(async () => {
    if (!sessionId) { setSnapshots([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from('biomechanics_snapshots')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });
    setSnapshots((data ?? []) as BiomechanicsSnapshot[]);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { fetchSnapshots(); }, [fetchSnapshots]);

  const saveSnapshot = async (snapshot: Omit<BiomechanicsSnapshot, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('biomechanics_snapshots')
      .insert(snapshot)
      .select()
      .single();
    if (error) throw new Error(error.message);

    setSnapshots((prev) => [data as BiomechanicsSnapshot, ...prev]);

    const { count } = await supabase
      .from('biomechanics_snapshots')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', snapshot.session_id);

    await supabase
      .from('biomechanics_sessions')
      .update({ snapshot_count: count ?? 0, updated_at: new Date().toISOString() })
      .eq('id', snapshot.session_id);

    return data as BiomechanicsSnapshot;
  };

  const updateSnapshot = async (id: string, updates: Partial<BiomechanicsSnapshot>) => {
    const { data, error } = await supabase
      .from('biomechanics_snapshots')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    setSnapshots((prev) => prev.map((s) => (s.id === id ? (data as BiomechanicsSnapshot) : s)));
    return data as BiomechanicsSnapshot;
  };

  const deleteSnapshot = async (id: string) => {
    const { error } = await supabase.from('biomechanics_snapshots').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
  };

  return { snapshots, loading, fetchSnapshots, saveSnapshot, updateSnapshot, deleteSnapshot };
}
