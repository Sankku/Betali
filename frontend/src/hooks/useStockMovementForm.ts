import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useCallback, useMemo } from "react";
import { StockMovementFormData } from "../services/api/stockMovementService";

const stockMovementSchema = z.object({
  movement_type: z
    .string()
    .min(1, "Movement type is required")
    .refine(
      (val) => ["entry", "exit", "adjustment", "senasa"].includes(val),
      "Invalid movement type"
    ),
  quantity: z
    .number({ required_error: "Quantity is required" })
    .positive("Quantity must be greater than 0")
    .int("Quantity must be a whole number"),
  product_id: z
    .string()
    .min(1, "Product is required"),
  warehouse_id: z
    .string()
    .min(1, "Warehouse is required"),
  reference: z
    .string()
    .max(500, "Reference cannot exceed 500 characters")
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
    // Only reset when editing and the initialData actually changed (e.g. user opens
    // a different movement). Never auto-reset in create mode — that would wipe the
    // user's input on any re-render triggered by a failed submission.
    if (initialData && mode === "edit") {
      const currentValues = form.getValues();
      const newMovementType = initialData.movement_type || "";
      const newQuantity = initialData.quantity || 0;
      const newProductId = initialData.product_id || "";
      const newWarehouseId = initialData.warehouse_id || "";
      const newReference = initialData.reference || "";
      const newMovementDate = initialData.movement_date || new Date().toISOString().split('T')[0];

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
  ]);

  const handleSubmit = useCallback(
    (event?: React.FormEvent) => {
      return form.handleSubmit(async (data) => {
        // Let the error propagate to the caller (page component) so it can
        // show a toast/alert without losing the form values.
        // Only reset on actual success.
        await onSubmit?.(data);

        if (mode === "create") {
          resetForm();
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
      return { isValid: false, errors: { general: "Validation error" } };
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
          error: error.errors[0]?.message || "Validation error",
        };
      }
      return { isValid: false, error: "Validation error" };
    }
  }, []);

  return {
    validateMovementData,
    validateField,
    schema: stockMovementSchema,
  };
}