import { supabase } from '../../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

class HttpClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async getHeaders(): Promise<HeadersInit> {
    const { data } = await supabase.auth.getSession();
    const session = data.session;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (session) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    // Add organization context from localStorage
    try {
      const currentOrganizationId = localStorage.getItem('currentOrganizationId');
      if (currentOrganizationId) {
        headers['x-organization-id'] = currentOrganizationId;
      }
    } catch (e) {
      // Ignore localStorage errors
      console.warn('Could not read organization context from localStorage:', e);
    }

    return headers;
  }

  async get<T>(endpoint: string): Promise<T> {
    const headers = await this.getHeaders();
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        await this.handleResponseError(response);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error in GET ${endpoint}:`, error);
      throw error;
    }
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const headers = await this.getHeaders();
    
    try {
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
    } catch (error) {
      console.error(`Error in POST ${endpoint}:`, error);
      throw error;
    }
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    const headers = await this.getHeaders();
    
    try {
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
    } catch (error) {
      console.error(`Error in PUT ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Performs a DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    const headers = await this.getHeaders();
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        await this.handleResponseError(response);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error in DELETE ${endpoint}:`, error);
      throw error;
    }
  }

  private async handleResponseError(response: Response): Promise<never> {
    if (response.status === 401) {
      const {  error } = await supabase.auth.refreshSession();
      
      if (error) {
        await supabase.auth.signOut();
        window.location.href = '/login?error=session_expired';
        throw new Error('Session expired. Please sign in again.');
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