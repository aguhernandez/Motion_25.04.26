import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { AeroPosition } from '../lib/aeroCalculations';

export function useAerodynamics(athleteId?: string) {
  const [positions, setPositions] = useState<AeroPosition[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('aerodynamics_positions')
      .select('*')
      .order('created_at', { ascending: false });
    if (athleteId) q = q.eq('athlete_id', athleteId);
    const { data } = await q;
    setPositions((data ?? []) as AeroPosition[]);
    setLoading(false);
  }, [athleteId]);

  useEffect(() => { fetch(); }, [fetch]);

  const save = async (pos: Omit<AeroPosition, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('aerodynamics_positions')
      .insert(pos)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const saved = data as AeroPosition;
    setPositions((prev) => [saved, ...prev]);
    return saved;
  };

  const remove = async (id: string) => {
    await supabase.from('aerodynamics_positions').delete().eq('id', id);
    setPositions((prev) => prev.filter((p) => p.id !== id));
  };

  const update = async (id: string, updates: Partial<AeroPosition>) => {
    const { data, error } = await supabase
      .from('aerodynamics_positions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const updated = data as AeroPosition;
    setPositions((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  };

  return { positions, loading, save, remove, update, refetch: fetch };
}
