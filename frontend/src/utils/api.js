import { auth } from '../firebase';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '' : 'https://kovidam-skill-graph.onrender.com')).replace(/\/$/, '');

/**
 * Enhanced fetch wrapper that automatically:
 * 1. Attaches the Firebase ID Token as a Bearer header if user is signed in.
 * 2. Handles the API base URL.
 * 3. Adds global error handling logic if needed.
 */
export async function authFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  
  // Try to get fresh token if user is signed in
  let token = null;
  if (auth.currentUser) {
    try {
      token = await auth.currentUser.getIdToken();
    } catch (err) {
      console.warn('[api] Failed to get auth token', err);
    }
  }

  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
}
