export interface HubAthlete {
  id: string;
  email: string;
  full_name: string;
  name?: string;
  role?: string;
  sport_primary?: string | null;
  membership_slug?: string | null;
}

const SESSION_TOKEN_KEY = 'hub_session_token';

function getProxyUrl(): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hub-data-proxy`;
}

function getToken(): string | null {
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

export async function getCoachAthletes(coachEmail: string): Promise<HubAthlete[]> {
  const token = getToken();
  if (!token) {
    console.warn('[HubAPI] No session token found, skipping coach-athletes fetch');
    return [];
  }

  if (!coachEmail) {
    console.warn('[HubAPI] No coach email provided, skipping coach-athletes fetch');
    return [];
  }

  const url = `${getProxyUrl()}?endpoint=coach-athletes&coach_email=${encodeURIComponent(coachEmail)}`;
  console.log('[HubAPI] Fetching coach-athletes from:', url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
    });

    const text = await res.text();
    console.log('[HubAPI] coach-athletes response status:', res.status);

    if (!res.ok) {
      console.error('[HubAPI] coach-athletes failed:', res.status, text);
      return [];
    }

    const data = JSON.parse(text);
    const athletes = Array.isArray(data) ? data : data.athletes ?? data.data ?? [];
    console.log('[HubAPI] Parsed athletes count:', athletes.length);
    return athletes;
  } catch (err) {
    console.error('[HubAPI] coach-athletes exception:', err);
    return [];
  }
}
