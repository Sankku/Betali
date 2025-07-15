import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useCallback, useMemo } from "react";
import { StockMovementFormData } from "../services/api/stockMovementService";

const stockMovementSchema = z.object({
  movement_type: z
    .string()
    .min(1, "El tipo de movimiento es requerido")
    .refine(
      (val) => ["entry", "exit", "adjustment", "senasa"].includes(val),
      "Tipo de movimiento inválido"
    ),
  quantity: z
    .number({ required_error: "La cantidad es requerida" })
    .positive("La cantidad debe ser mayor a 0"),
  product_id: z
    .string()
    .min(1, "El producto es requerido"),
  warehouse_id: z
    .string()
    .min(1, "El almacén es requerido"),
  reference: z
    .string()
    .max(500, "La referencia no puede exceder 500 caracteres")
    .optional(),
  movement_date: z
    .string()
    .optional(),
});

export type StockMovementFormSchema = z.infer<typeof stockMovementSchema>;

export interface UseStockMovementFormOptions {
  initialData?: Partial<StockMovementFormData>;
  mode?: "create" | "edit";
  onSubmit?: (data: StockMovementFormSchema) => void | Promise<void>;
}

export function useStockMovementForm({
  initialData,
  mode = "create",
  onSubmit,
}: UseStockMovementFormOptions = {}) {
  const defaultValues = useMemo(() => ({
    movement_type: initialData?.movement_type || "",
    quantity: initialData?.quantity || 0,
    product_id: initialData?.product_id || "",
    warehouse_id: initialData?.warehouse_id || "",
    reference: initialData?.reference || "",
    movement_date: initialData?.movement_date || new Date().toISOString().split('T')[0],
  }), [
    initialData?.movement_type,
    initialData?.quantity,
    initialData?.product_id,
    initialData?.warehouse_id,
    initialData?.reference,
    initialData?.movement_date,
  ]);

  const form = useForm<StockMovementFormSchema>({
    resolver: zodResolver(stockMovementSchema),
    defaultValues,
    mode: "onChange",
  });

  const resetForm = useCallback(() => {
    form.reset({
      movement_type: "",
      quantity: 0,
      product_id: "",
      warehouse_id: "",
      reference: "",
      movement_date: new Date().toISOString().split('T')[0],
    });
  }, [form]);

  useEffect(() => {
    if (initialData && mode === "edit") {
      const currentValues = form.getValues();
      const newMovementType = initialData.movement_type || "";
      const newQuantity = initialData.quantity || 0;
      const newProductId = initialData.product_id || "";
      const newWarehouseId = initialData.warehouse_id || "";
      const newReference = initialData.reference || "";
      const newMovementDate = initialData.movement_date || new Date().toISOString().split('T')[0];

      console.log('Loading initial data:', { 
        newMovementType,
        newQuantity,
        newProductId,
        newWarehouseId,
        newReference,
        newMovementDate,
        initialData 
      });

      if (
        currentValues.movement_type !== newMovementType ||
        currentValues.quantity !== newQuantity ||
        currentValues.product_id !== newProductId ||
        currentValues.warehouse_id !== newWarehouseId ||
        currentValues.reference !== newReference ||
        currentValues.movement_date !== newMovementDate
      ) {
        form.reset({
          movement_type: newMovementType,
          quantity: newQuantity,
          product_id: newProductId,
          warehouse_id: newWarehouseId,
          reference: newReference,
          movement_date: newMovementDate,
        });
      }
    } else if (mode === "create") {
      resetForm();
    }
  }, [
    initialData?.movement_type,
    initialData?.quantity,
    initialData?.product_id,
    initialData?.warehouse_id,
    initialData?.reference,
    initialData?.movement_date,
    mode,
    form,
    resetForm
  ]);

  const handleSubmit = useCallback(
    (event?: React.FormEvent) => {
      return form.handleSubmit(async (data) => {
        try {
          await onSubmit?.(data);
          
          if (mode === "create") {
            resetForm();
          }
        } catch (error) {
          console.error("Error en submit del formulario:", error);
        }
      })(event);
    },
    [form, onSubmit, mode, resetForm]
  );

  const getFieldError = useCallback((fieldName: keyof StockMovementFormSchema) => {
    return form.formState.errors[fieldName]?.message;
  }, [form.formState.errors]);

  return {
    form,
    
    isValid: form.formState.isValid,
    isDirty: form.formState.isDirty,
    isSubmitting: form.formState.isSubmitting,
    errors: form.formState.errors,
    
    handleSubmit,
    resetForm,
    getFieldError,
    
    watchedValues: form.watch(),
    
    setValue: form.setValue,
    getValue: form.getValues,
    trigger: form.trigger,
  };
}

export function useStockMovementValidation() {
  const validateMovementData = useCallback((data: Partial<StockMovementFormData>) => {
    try {
      stockMovementSchema.parse(data);
      return { isValid: true, errors: null };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          errors: error.errors.reduce((acc, err) => {
            const path = err.path.join(".");
            acc[path] = err.message;
            return acc;
          }, {} as Record<string, string>),
        };
      }
      return { isValid: false, errors: { general: "Error de validación" } };
    }
  }, []);

  const validateField = useCallback((fieldName: keyof StockMovementFormSchema, value: any) => {
    try {
      const fieldSchema = stockMovementSchema.shape[fieldName];
      fieldSchema.parse(value);
      return { isValid: true, error: null };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          error: error.errors[0]?.message || "Error de validación",
        };
      }
      return { isValid: false, error: "Error de validación" };
    }
  }, []);

  return {
    validateMovementData,
    validateField,
    schema: stockMovementSchema,
  };
}