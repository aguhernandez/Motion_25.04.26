import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { BiomechanicsSession, SessionType, Discipline } from '../lib/types';

export function useSessions(athleteId?: string) {
  const [sessions, setSessions] = useState<BiomechanicsSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('biomechanics_sessions')
      .select('*, athlete:athletes(*)')
      .order('created_at', { ascending: false });
    if (athleteId) query = query.eq('athlete_id', athleteId);
    const { data, error } = await query;
    if (error) setError(error.message);
    else setSessions(data ?? []);
    setLoading(false);
  }, [athleteId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const createSession = async (params: {
    athlete_id?: string;
    session_type: SessionType;
    discipline: Discipline;
    title: string;
    notes?: string;
  }) => {
    const { data, error } = await supabase
      .from('biomechanics_sessions')
      .insert(params)
      .select('*, athlete:athletes(*)')
      .single();
    if (error) throw new Error(error.message);
    setSessions((prev) => [data as BiomechanicsSession, ...prev]);
    return data as BiomechanicsSession;
  };

  const updateSession = async (id: string, updates: Partial<BiomechanicsSession>) => {
    const { data, error } = await supabase
      .from('biomechanics_sessions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, athlete:athletes(*)')
      .single();
    if (error) throw new Error(error.message);
    setSessions((prev) => prev.map((s) => (s.id === id ? (data as BiomechanicsSession) : s)));
    return data as BiomechanicsSession;
  };

  const deleteSession = async (id: string) => {
    const { error } = await supabase.from('biomechanics_sessions').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  return { sessions, loading, error, fetchSessions, createSession, updateSession, deleteSession };
}
