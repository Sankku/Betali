import { httpClient } from '../http/httpClient';
import { supabase } from '../../lib/supabase';

export interface CreateCheckoutRequest {
  subscriptionId: string;
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  currency: 'ARS' | 'USD' | 'BRL' | 'MXN' | 'CLP' | 'COP' | 'PEN' | 'UYU';
}

export interface CreateCheckoutResponse {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint?: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  billingCycle: string;
}

export interface PaymentStatus {
  id: string;
  status: string;
  statusDetail: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentType: string;
  dateCreated: string;
  dateApproved?: string;
  externalReference: string;
}

export interface Payment {
  payment_id: string;
  subscription_id: string;
  organization_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: 'pending' | 'confirmed' | 'failed';
  payment_date: string;
  confirmed_at?: string;
  reference_number?: string;
  notes?: string;
}

class MercadoPagoService {
  private readonly BASE_PATH = '/api/mercadopago';

  /**
   * Create checkout preference for subscription payment
   *
   * @param data Checkout request data
   * @returns Checkout preference with redirect URL
   */
  async createCheckout(data: CreateCheckoutRequest): Promise<CreateCheckoutResponse> {
    const response = await httpClient.post<{ success: boolean; data: CreateCheckoutResponse }>(
      `${this.BASE_PATH}/create-checkout`,
      data
    );
    return response.data;
  }

  /**
   * Get payment status by payment ID
   *
   * @param paymentId Mercado Pago payment ID
   * @returns Payment status and details
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    const response = await httpClient.get<{ success: boolean; data: PaymentStatus }>(
      `${this.BASE_PATH}/payment/${paymentId}`
    );
    return response.data;
  }

  /**
   * Get payment history for a subscription
   *
   * @param subscriptionId Subscription ID
   * @returns Array of payments
   */
  async getSubscriptionPayments(subscriptionId: string): Promise<Payment[]> {
    const response = await httpClient.get<{ success: boolean; data: Payment[] }>(
      `${this.BASE_PATH}/subscription/${subscriptionId}/payments`
    );
    return response.data;
  }

  /**
   * Cancel a subscription
   *
   * @param subscriptionId Subscription ID
   * @param reason Optional cancellation reason
   * @returns Updated subscription
   */
  async cancelSubscription(subscriptionId: string, reason?: string): Promise<any> {
    const response = await httpClient.post<{ success: boolean; data: any }>(
      `${this.BASE_PATH}/subscription/${subscriptionId}/cancel`,
      { reason }
    );
    return response.data;
  }

  /**
   * Get supported payment methods for a country
   *
   * @param countryCode ISO country code (AR, BR, MX, etc.)
   * @returns Array of payment method codes
   */
  async getPaymentMethods(countryCode: string = 'AR'): Promise<string[]> {
    const response = await httpClient.get<{ success: boolean; data: { country: string; methods: string[] } }>(
      `${this.BASE_PATH}/payment-methods/${countryCode}`
    );
    return response.data.methods;
  }

  /**
   * Redirect to Mercado Pago checkout
   *
   * @param initPoint Redirect URL from createCheckout
   */
  redirectToCheckout(initPoint: string): void {
    window.location.href = initPoint;
  }

  /**
   * Get payment status from URL query params (used in success/failure pages)
   *
   * @returns Payment info from URL params
   */
  getPaymentInfoFromURL(): {
    paymentId?: string;
    status?: string;
    externalReference?: string;
    preferenceId?: string;
  } {
    const params = new URLSearchParams(window.location.search);

    return {
      paymentId: params.get('payment_id') || undefined,
      status: params.get('status') || undefined,
      externalReference: params.get('external_reference') || undefined,
      preferenceId: params.get('preference_id') || undefined
    };
  }

  /**
   * Map payment status to user-friendly message
   *
   * @param status MP payment status
   * @returns User-friendly message
   */
  getStatusMessage(status: string): { title: string; message: string; type: 'success' | 'error' | 'warning' } {
    const statusMessages = {
      approved: {
        title: '¡Pago exitoso!',
        message: 'Tu suscripción ha sido activada correctamente.',
        type: 'success' as const
      },
      pending: {
        title: 'Pago pendiente',
        message: 'Tu pago está siendo procesado. Te notificaremos cuando se confirme.',
        type: 'warning' as const
      },
      in_process: {
        title: 'Pago en proceso',
        message: 'Estamos procesando tu pago. Esto puede tomar unos minutos.',
        type: 'warning' as const
      },
      rejected: {
        title: 'Pago rechazado',
        message: 'No pudimos procesar tu pago. Por favor, intenta con otro método de pago.',
        type: 'error' as const
      },
      cancelled: {
        title: 'Pago cancelado',
        message: 'Has cancelado el proceso de pago.',
        type: 'error' as const
      },
      refunded: {
        title: 'Pago reembolsado',
        message: 'Tu pago ha sido reembolsado.',
        type: 'warning' as const
      },
      charged_back: {
        title: 'Contracargo',
        message: 'Se ha procesado un contracargo en este pago.',
        type: 'error' as const
      }
    };

    return statusMessages[status as keyof typeof statusMessages] || {
      title: 'Estado desconocido',
      message: 'No pudimos determinar el estado de tu pago.',
      type: 'error' as const
    };
  }

  /**
   * Get currency symbol
   *
   * @param currency Currency code
   * @returns Currency symbol
   */
  getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = {
      ARS: '$',
      USD: 'US$',
      BRL: 'R$',
      MXN: 'MX$',
      CLP: 'CLP$',
      COP: 'COL$',
      PEN: 'S/',
      UYU: '$U'
    };

    return symbols[currency] || currency;
  }

  /**
   * Format amount with currency
   *
   * @param amount Amount to format
   * @param currency Currency code
   * @returns Formatted amount string
   */
  formatAmount(amount: number, currency: string): string {
    const symbol = this.getCurrencySymbol(currency);
    return `${symbol} ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Download payment receipt as PDF
   *
   * @param paymentId Payment ID
   */
  async downloadReceipt(paymentId: string): Promise<void> {
    const { data } = await supabase.auth.getSession();
    const session = data.session;

    const headers: HeadersInit = {};
    if (session) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const currentOrganizationId = localStorage.getItem('currentOrganizationId');
    if (currentOrganizationId) {
      headers['x-organization-id'] = currentOrganizationId;
    }

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${this.BASE_PATH}/payment/${paymentId}/receipt`, {
      headers
    });

    if (!response.ok) {
      throw new Error('Error al descargar el recibo');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recibo-${paymentId.substring(0, 8)}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  /**
   * Get receipt download URL (for opening in new tab)
   *
   * @param paymentId Payment ID
   * @returns Receipt URL
   */
  getReceiptUrl(paymentId: string): string {
    return `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${this.BASE_PATH}/payment/${paymentId}/receipt`;
  }
}

export const mercadoPagoService = new MercadoPagoService();
