import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { ReferenceRange } from '../lib/types';

export function useReferenceRanges(discipline?: string) {
  const [ranges, setRanges] = useState<ReferenceRange[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRanges = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('reference_ranges').select('*').order('angle_name');
    if (discipline) query = query.eq('discipline', discipline);
    const { data } = await query;
    setRanges((data ?? []) as ReferenceRange[]);
    setLoading(false);
  }, [discipline]);

  useEffect(() => { fetchRanges(); }, [fetchRanges]);

  const createRange = async (range: Omit<ReferenceRange, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('reference_ranges')
      .insert(range)
      .select()
      .single();
    if (error) throw new Error(error.message);
    setRanges((prev) => [...prev, data as ReferenceRange]);
    return data as ReferenceRange;
  };

  const updateRange = async (id: string, updates: Partial<ReferenceRange>) => {
    const { data, error } = await supabase
      .from('reference_ranges')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    setRanges((prev) => prev.map((r) => (r.id === id ? (data as ReferenceRange) : r)));
    return data as ReferenceRange;
  };

  const deleteRange = async (id: string) => {
    const { error } = await supabase.from('reference_ranges').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setRanges((prev) => prev.filter((r) => r.id !== id));
  };

  return { ranges, loading, fetchRanges, createRange, updateRange, deleteRange };
}
