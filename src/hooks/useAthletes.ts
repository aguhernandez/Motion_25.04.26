import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getCoachAthletes } from '../lib/hubApi';
import type { HubAthlete } from '../lib/hubApi';
import type { Athlete } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';

export function useAthletes() {
  const { profile } = useAuth();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isCoach = profile?.role === 'coach' || profile?.role === 'admin';

  const fetchAthletes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: localAthletes, error: dbError } = await supabase
        .from('athletes')
        .select('*')
        .order('name');

      if (dbError) {
        setError(dbError.message);
        setLoading(false);
        return;
      }

      let merged = localAthletes ?? [];

      if (isCoach) {
        console.log('[useAthletes] Profile is coach/admin, fetching Hub athletes...');
        const hubAthletes = await getCoachAthletes();
        console.log('[useAthletes] Hub returned', hubAthletes.length, 'athletes');

        if (hubAthletes.length > 0) {
          const localByHubId = new Map<string, Athlete>();
          const localByEmail = new Map<string, Athlete>();
          for (const a of merged) {
            if (a.lab_athlete_id) localByHubId.set(a.lab_athlete_id, a);
            if (a.email) localByEmail.set(a.email.toLowerCase(), a);
          }

          const toCreate: HubAthlete[] = [];
          for (const ha of hubAthletes) {
            const existsByHubId = localByHubId.has(ha.id);
            const existsByEmail = ha.email ? localByEmail.has(ha.email.toLowerCase()) : false;
            if (!existsByHubId && !existsByEmail) {
              toCreate.push(ha);
            }
          }

          if (toCreate.length > 0) {
            console.log('[useAthletes] Creating', toCreate.length, 'new athletes from Hub');
            const inserts = toCreate.map((ha) => ({
              name: ha.name || ha.email,
              email: ha.email,
              lab_athlete_id: ha.id,
              notes: '',
              avatar_url: '',
            }));

            const { data: created, error: insertError } = await supabase
              .from('athletes')
              .insert(inserts)
              .select();

            if (insertError) {
              console.error('[useAthletes] Auto-create from Hub failed:', insertError.message);
            } else if (created) {
              merged = [...merged, ...created];
            }
          }
        }
      }

      merged.sort((a, b) => a.name.localeCompare(b.name));
      setAthletes(merged);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [isCoach]);

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
