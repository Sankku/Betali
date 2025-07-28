import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useCallback, useMemo } from "react";
import { WarehouseFormData } from "./useWarehouse";

const warehouseSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name cannot exceed 100 characters")
    .trim(),
  location: z
    .string()
    .min(1, "Location is required")
    .min(3, "Location must be at least 3 characters")
    .max(200, "Location cannot exceed 200 characters")
    .trim(),
  is_active: z.boolean().optional(),
});

export type WarehouseFormSchema = z.infer<typeof warehouseSchema>;

export interface UseWarehouseFormOptions {
  initialData?: Partial<WarehouseFormData>;
  mode?: "create" | "edit";
  onSubmit?: (data: WarehouseFormSchema) => void | Promise<void>;
}

export function useWarehouseForm({
  initialData,
  mode = "create",
  onSubmit,
}: UseWarehouseFormOptions = {}) {
  const defaultValues = useMemo(() => ({
    name: initialData?.name || "",
    location: initialData?.location || "",
    is_active: initialData?.is_active ?? true,
  }), [initialData?.name, initialData?.location, initialData?.is_active]);

  const form = useForm<WarehouseFormSchema>({
    resolver: zodResolver(warehouseSchema),
    defaultValues,
    mode: "onChange",
  });

  const resetForm = useCallback(() => {
    form.reset({
      name: "",
      location: "",
      is_active: true,
    });
  }, [form]);

  useEffect(() => {
    if (initialData && (mode === "edit")) {
      const currentValues = form.getValues();
      const newName = initialData.name || "";
      const newLocation = initialData.location || "";
      const newIsActive = initialData.is_active ?? true;

      console.log('Loading initial data:', { 
        newName, 
        newLocation, 
        newIsActive, 
        initialData 
      });

      if (
        currentValues.name !== newName ||
        currentValues.location !== newLocation ||
        currentValues.is_active !== newIsActive
      ) {
        form.reset({
          name: newName,
          location: newLocation,
          is_active: newIsActive,
        });
      }
    } else if (mode === "create") {
      resetForm();
    }
  }, [
    initialData?.name, 
    initialData?.location, 
    initialData?.is_active, 
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
          console.error("Error in form submit:", error);
        }
      })(event);
    },
    [form, onSubmit, mode, resetForm]
  );

  const getFieldError = useCallback((fieldName: keyof WarehouseFormSchema) => {
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

export function useWarehouseValidation() {
  const validateWarehouseData = useCallback((data: Partial<WarehouseFormData>) => {
    try {
      warehouseSchema.parse(data);
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

  const validateField = useCallback((fieldName: keyof WarehouseFormSchema, value: any) => {
    try {
      const fieldSchema = warehouseSchema.shape[fieldName];
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
    validateWarehouseData,
    validateField,
    schema: warehouseSchema,
  };
}