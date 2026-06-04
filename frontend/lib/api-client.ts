import { useAuthStore } from "./store";

const API_BASE = '/api/v1';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().token;
  
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Auto-logout on unauthorized
    useAuthStore.getState().logout();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || data.message || 'API request failed');
  }

  return data;
}

export async function fetchAssessmentTemplate(token: string) {
  return fetchApi(`/public/assessment/${token}`);
}

export async function submitAssessmentResponses(token: string, responses: any[]) {
  return fetchApi(`/public/assessment/${token}/responses`, {
    method: 'POST',
    body: JSON.stringify({ responses }),
  });
}

export async function saveDraftResponses(token: string, responses: any[]) {
  return fetchApi(`/public/assessment/${token}/save-draft`, {
    method: 'POST',
    body: JSON.stringify({ responses }),
  });
}
