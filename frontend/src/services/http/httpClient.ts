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

  async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const headers = await this.getHeaders();
    
    // Remove Content-Type so browser sets it to multipart/form-data with boundary
    if ('Content-Type' in headers) {
      delete (headers as Record<string, string>)['Content-Type'];
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        await this.handleResponseError(response);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error in POST (FormData) ${endpoint}:`, error);
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
   * Performs a PATCH request
   */
  async patch<T>(endpoint: string, data: any): Promise<T> {
    const headers = await this.getHeaders();

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        await this.handleResponseError(response);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error in PATCH ${endpoint}:`, error);
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
      // Prioritize message over error for a more descriptive message
      const errorMessage = errorData.message || errorData.error || `Error: ${response.status}`;
      
      const enhancedError: any = new Error(errorMessage);
      enhancedError.status = response.status;
      enhancedError.code = errorData.code;
      enhancedError.field = errorData.field;
      enhancedError.data = errorData;
      
      throw enhancedError;
    } catch (e: any) {
      // If JSON parsing fails, use status text
      if (e.message !== `Error: ${response.statusText}` && !e.status) {
        throw new Error(`Error: ${response.statusText}`);
      }
      throw e;
    }
  }
}

export const httpClient = new HttpClient(API_URL);