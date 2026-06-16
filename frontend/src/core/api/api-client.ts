import { useAuthStore } from '@/src/features/auth/store/authStore';

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

  if (!headers.has('X-Trace-Id')) {
    const traceId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2) + Date.now().toString(36);
    headers.set('X-Trace-Id', traceId);
  }

  let response;
  try {
    const fetchOptions = { ...options };
    if (!fetchOptions.method || fetchOptions.method.toUpperCase() === 'GET') {
      if (!fetchOptions.cache) {
        fetchOptions.cache = 'no-store';
      }
    }
    
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...fetchOptions,
      headers,
    });
  } catch (error) {
    console.error("Network Error:", error);
    throw new Error("Unable to connect to the server. Please check your internet connection or try again later.");
  }

  if (response.status === 401) {
    // Auto-logout on unauthorized
    useAuthStore.getState().logout();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  let data;
  try {
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { message: text || `HTTP Error ${response.status}` };
    }
  } catch (e) {
    data = { message: "Failed to read response from server." };
  }

  if (!response.ok) {
    let errorMessage = 'API request failed';
    if (data.detail) {
      if (typeof data.detail === 'string') {
        errorMessage = data.detail;
      } else if (Array.isArray(data.detail)) {
        errorMessage = data.detail.map((e: any) => e.msg).join(', ');
      } else {
        errorMessage = JSON.stringify(data.detail);
      }
    } else if (data.message) {
      errorMessage = data.message;
    }
    throw new Error(errorMessage);
  }

  return data;
}

export async function fetchAssessmentTemplate(token: string) {
  return fetchApi(`/public/assessment/${token}`, { cache: 'no-store' });
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
