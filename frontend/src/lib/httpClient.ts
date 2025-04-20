import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Cliente HTTP para interactuar con la API del backend
class HttpClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Método para agregar el token de autenticación a las cabeceras
  private async getHeaders(): Promise<HeadersInit> {
    const { data } = await supabase.auth.getSession();
    const session = data.session;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (session) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    return headers;
  }

  // Método GET
  async get<T>(endpoint: string): Promise<T> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      await this.handleResponseError(response);
    }

    return await response.json();
  }

  // Método POST
  async post<T>(endpoint: string, data: any): Promise<T> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      await this.handleResponseError(response);
    }

    return await response.json();
  }

  // Método PUT
  async put<T>(endpoint: string, data: any): Promise<T> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      await this.handleResponseError(response);
    }

    return await response.json();
  }

  // Método DELETE
  async delete<T>(endpoint: string): Promise<T> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      await this.handleResponseError(response);
    }

    return await response.json();
  }

  private async handleResponseError(response: Response): Promise<never> {
    if (response.status === 401) {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        await supabase.auth.signOut();
        window.location.href = '/login';
        throw new Error('Sesión expirada. Por favor, inicie sesión nuevamente.');
      }
    }

    try {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error: ${response.status}`);
    } catch (e) {
      throw new Error(`Error: ${response.statusText}`);
    }
  }
}

export const httpClient = new HttpClient(API_URL);