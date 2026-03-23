import { httpClient } from '../http/httpClient';
import type {
  ProductFormulaItem,
  AddFormulaItemData,
  ProductionMovementRequest,
  ProductionPreview,
} from '../../types/productFormula';

export const productFormulaService = {
  async getFormula(productId: string): Promise<ProductFormulaItem[]> {
    const response = await httpClient.get<{ data: ProductFormulaItem[] }>(
      `/api/product-formulas/${productId}`
    );
    return (response as any).data || response;
  },

  async addFormulaItem(data: AddFormulaItemData): Promise<{ message: string; data: ProductFormulaItem }> {
    return httpClient.post('/api/product-formulas', data);
  },

  async updateFormulaItem(
    formulaId: string,
    quantity_required: number
  ): Promise<{ message: string; data: ProductFormulaItem }> {
    return httpClient.put(`/api/product-formulas/${formulaId}`, { quantity_required });
  },

  async deleteFormulaItem(formulaId: string): Promise<{ message: string }> {
    return httpClient.delete(`/api/product-formulas/${formulaId}`);
  },

  async validateProduction(
    productId: string,
    quantity: number,
    warehouseId: string
  ): Promise<ProductionPreview> {
    const response = await httpClient.get<{ data: ProductionPreview }>(
      `/api/product-formulas/${productId}/validate?quantity=${quantity}&warehouseId=${warehouseId}`
    );
    return (response as any).data || response;
  },

  async createProductionMovement(
    data: ProductionMovementRequest
  ): Promise<{ message: string; data: unknown }> {
    return httpClient.post('/api/stock-movements/production', data);
  },
};
