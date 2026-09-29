const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

/**
 * Helper to make HTTP requests with automatic Bearer token injection
 */
export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  let data = {};
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    const errorMessage =
      data.error?.message ||
      (data.error?.details ? data.error.details.map((d) => d.message).join(', ') : 'Request failed');

    const error = new Error(errorMessage);
    error.status = response.status;
    error.code = data.error?.code || 'UNKNOWN_ERROR';
    error.details = data.error?.details || null;
    throw error;
  }

  return data;
}
