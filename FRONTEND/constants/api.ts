import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from './config';

const TOKEN_KEY = 'nutriscan_auth_token';

// ─── Token helpers ──────────────────────────────────────────────────────────

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function saveToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

// ─── Core fetch helper ───────────────────────────────────────────────────────

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: object;
  auth?: boolean; // default true
}

export async function apiFetch<T = any>(
  path: string,
  options: FetchOptions = {}
): Promise<{ data: T | null; error: string | null; status: number }> {
  const { method = 'GET', body, auth = true } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth) {
    const token = await getToken();
    if (token) headers['Authorization'] = `Token ${token}`;
  }

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!response.ok) {
      // Improved error extraction: check for 'error', 'detail', 'non_field_errors', or the first field error
      let errorMsg = 'Request failed';
      if (typeof data === 'object' && data !== null) {
        if (data.error) errorMsg = data.error;
        else if (data.detail) errorMsg = data.detail;
        else if (Array.isArray(data.non_field_errors)) errorMsg = data.non_field_errors[0];
        else {
          // Find the first field error (e.g. {"email": ["..."]})
          const firstKey = Object.keys(data)[0];
          const firstVal = data[firstKey];
          if (Array.isArray(firstVal)) errorMsg = `${firstKey}: ${firstVal[0]}`;
          else if (typeof firstVal === 'string') errorMsg = `${firstKey}: ${firstVal}`;
          else errorMsg = `Error ${response.status}`;
        }
      } else {
        errorMsg = `Error ${response.status}`;
      }
      return { data: null, error: String(errorMsg), status: response.status };
    }

    return { data, error: null, status: response.status };
  } catch (e: any) {
    return {
      data: null,
      error: e?.message || 'Network error — is the backend running?',
      status: 0,
    };
  }
}

// ─── Auth API ────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  age: string;
  gender: string;
  weight_kg: number | null;
  height_cm: number | null;
  health_goals: string;
  dietary_restrictions: string;        // comma-separated string from backend
  dietary_restrictions_list: string[]; // read-only computed list
  known_allergens: string[];
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export const AuthAPI = {
  register: (data: {
    name: string;
    email: string;
    password: string;
    age: string;
    gender?: string;
    weight_kg?: number | null;
    height_cm?: number | null;
    health_goals: string;
    dietary_restrictions?: string;
    known_allergens?: string[];
  }) =>
    apiFetch<AuthResponse>('/api/auth/register/', {
      method: 'POST',
      body: data,
      auth: false,
    }),

  login: (email: string, password: string) =>
    apiFetch<AuthResponse>('/api/auth/login/', {
      method: 'POST',
      body: { email, password },
      auth: false,
    }),

  logout: () =>
    apiFetch('/api/auth/logout/', { method: 'POST' }),

  getProfile: () =>
    apiFetch<UserProfile>('/api/auth/profile/'),

  updateProfile: (data: Partial<Pick<UserProfile, 'name' | 'age' | 'health_goals'>>) =>
    apiFetch<UserProfile>('/api/auth/profile/', { method: 'PUT', body: data }),
};

// ─── Products API ─────────────────────────────────────────────────────────────

export interface NormalizedProduct {
  id: string;
  name: string;
  brand: string;
  image_url?: string;
  image_small_url?: string;
  ingredients?: string;
  allergens?: string[];
  nutriscore_grade?: string;
  additives_tags?: string[];
  serving_quantity?: number;
  nutrients_100g: {
    energy_kcal?: number;
    proteins?: number;
    carbohydrates?: number;
    fat?: number;
    fiber?: number;
    sugars?: number;
    sodium?: number;
    saturated_fat?: number;
    fruits_vegetables_nuts?: number;
  };
}

export const ProductsAPI = {
  search: (q: string, page = 1, pageSize = 20) =>
    apiFetch<{ count: number; page: number; page_size: number; products: NormalizedProduct[] }>(
      `/api/products/search/?q=${encodeURIComponent(q)}&page=${page}&page_size=${pageSize}`
    ),

  byBarcode: (code: string) =>
    apiFetch<NormalizedProduct>(`/api/products/barcode/${code}/`),

  analyzeLabel: (base64Image: string, productName?: string) =>
    apiFetch<NormalizedProduct>('/api/products/analyze-label/', {
      method: 'POST',
      body: { image: base64Image, ...(productName ? { product_name: productName } : {}) },
    }),

  analyzeBarcode: (base64Image: string) =>
    apiFetch<NormalizedProduct>('/api/products/analyze-barcode/', {
      method: 'POST',
      body: { image: base64Image },
    }),
};

// ─── History API ──────────────────────────────────────────────────────────────

export interface HistoryEntry {
  id: number;
  product_id: string;
  name: string;
  brand: string;
  image_url?: string;
  scanned_at: string;
}

export const HistoryAPI = {
  list: () => apiFetch<HistoryEntry[]>('/api/history/'),

  add: (item: { product_id: string; name: string; brand: string; image_url?: string }) =>
    apiFetch<HistoryEntry>('/api/history/', { method: 'POST', body: item }),

  clearAll: () => apiFetch('/api/history/', { method: 'DELETE' }),

  deleteOne: (id: number) => apiFetch(`/api/history/${id}/`, { method: 'DELETE' }),
};
