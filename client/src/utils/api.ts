// API Client per DMS Backend

import { MIHUB_API_BASE_URL } from '@/config/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me/api/v1';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('API Error:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// GEO Service
export const geoAPI = {
  search: async (query?: string, lat?: number, lng?: number, category?: string) => {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (lat) params.append('lat', lat.toString());
    if (lng) params.append('lng', lng.toString());
    if (category) params.append('category', category);

    // Usa il nuovo endpoint di ricerca pubblica
    const response = await fetch(`${MIHUB_API_BASE_URL}/api/public/search?query=${encodeURIComponent(query || '')}`);
    if (!response.ok) {
      return { error: 'Search failed' };
    }
    const data = await response.json();
    return { data: { results: data.results || [], count: data.count || 0 } };
  },

  getMarket: async (id: string) => {
    return fetchAPI<any>(`/geo/markets/${id}`);
  },

  getShopsInMarket: async (marketId: string) => {
    return fetchAPI<{ shops: any[]; count: number }>(`/geo/markets/${marketId}/shops`);
  },
};

// SHOP Service
export const shopAPI = {
  getShop: async (id: string) => {
    return fetchAPI<any>(`/shop/${id}`);
  },

  getProducts: async (shopId: string) => {
    return fetchAPI<{ products: any[]; count: number }>(`/shop/${shopId}/products`);
  },

  bookProduct: async (shopId: string, productId: string, quantity: number) => {
    return fetchAPI<any>(`/shop/${shopId}/book`, {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    });
  },
};

// AUTH Service
export const authAPI = {
  login: async (email: string, password: string) => {
    return fetchAPI<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register: async (email: string, password: string, name: string) => {
    return fetchAPI<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  },

  getMe: async (token: string) => {
    return fetchAPI<{ user: any }>('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};
