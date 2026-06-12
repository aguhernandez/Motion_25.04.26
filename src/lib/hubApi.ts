export interface HubAthlete {
  id: string;
  email: string;
  name: string;
  role: string;
}

const SESSION_TOKEN_KEY = 'hub_session_token';

function getProxyUrl(): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hub-data-proxy`;
}

function getToken(): string | null {
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

export async function getCoachAthletes(): Promise<HubAthlete[]> {
  const token = getToken();
  if (!token) {
    console.warn('[HubAPI] No session token found, skipping coach-athletes fetch');
    return [];
  }

  const url = `${getProxyUrl()}?endpoint=coach-athletes`;
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
    console.log('[HubAPI] coach-athletes response body:', text.slice(0, 500));

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
