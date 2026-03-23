export interface ProductFormulaItem {
  formula_id: string;
  finished_product_id: string;
  raw_material_id: string;
  quantity_required: number;
  organization_id: string;
  created_at?: string;
  raw_material?: {
    product_id: string;
    name: string;
    unit?: string;
  };
}

export interface AddFormulaItemData {
  finished_product_id: string;
  raw_material_id: string;
  quantity_required: number;
}

export interface ProductionMovementRequest {
  finished_product_id: string;
  quantity_to_produce: number;
  warehouse_id: string;
  reference?: string;
}

export interface ProductionMaterialCheck {
  product_id: string;
  name: string;
  quantity_required: number;
  current_stock: number;
  sufficient: boolean;
}

export interface ProductionPreview {
  finished_product: { product_id: string; name: string };
  quantity_to_produce: number;
  materials_to_consume: ProductionMaterialCheck[];
  can_produce: boolean;
}
