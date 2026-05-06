import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Athlete } from '../lib/types';

export function useAthletes() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAthletes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('athletes')
      .select('*')
      .order('name');
    if (error) setError(error.message);
    else setAthletes(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAthletes();
  }, [fetchAthletes]);

  const createAthlete = async (athlete: Omit<Athlete, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('athletes')
      .insert(athlete)
      .select()
      .single();
    if (error) throw new Error(error.message);
    setAthletes((prev) => [...prev, data]);
    return data as Athlete;
  };

  const updateAthlete = async (id: string, updates: Partial<Athlete>) => {
    const { data, error } = await supabase
      .from('athletes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    setAthletes((prev) => prev.map((a) => (a.id === id ? (data as Athlete) : a)));
    return data as Athlete;
  };

  const deleteAthlete = async (id: string) => {
    const { error } = await supabase.from('athletes').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setAthletes((prev) => prev.filter((a) => a.id !== id));
  };

  return { athletes, loading, error, fetchAthletes, createAthlete, updateAthlete, deleteAthlete };
}
