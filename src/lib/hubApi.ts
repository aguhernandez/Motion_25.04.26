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
  if (!token) return [];

  const url = `${getProxyUrl()}?endpoint=coach-athletes`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    console.error('[HubAPI] coach-athletes failed:', res.status);
    return [];
  }

  const data = await res.json();
  return Array.isArray(data) ? data : data.athletes ?? [];
}
