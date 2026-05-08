// Auth utility to handle token storage and retrieval

const AUTH_KEY = 'parkiru:auth-user';

interface AuthUser {
  token?: string;
  id?: string;
  email?: string;
  name?: string;
  role?: string;
}

export function getAuthToken(): string | null {
  try {
    const authData = localStorage.getItem(AUTH_KEY);
    if (!authData) return null;
    
    const parsed: AuthUser = JSON.parse(authData);
    return parsed.token || null;
  } catch {
    return null;
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
  window.location.href = '/login';
}
