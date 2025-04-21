import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Form } from "../../common/Forms";
import { FormField } from "../../common/Forms/types";
import { Database } from "../../../types/database";
import { productsService } from "../../../services/api/productsService";

type Product = Database["public"]["Tables"]["products"]["Row"];

interface ProductFormProps {
  product?: Product;
  mode: "create" | "edit" | "view";
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ProductForm({
  product,
  mode,
  onSuccess,
  onCancel,
}: ProductFormProps) {
  const queryClient = useQueryClient();
  const isViewOnly = mode === "view";

  const mutation = useMutation({
    mutationFn: async (data: Partial<Product>) => {
      if (mode === "create") {
        return await productsService.create(data);
      } else if (mode === "edit" && product?.product_id) {
        return await productsService.update(product.product_id, data);
      }
      throw new Error("Operación no válida");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      if (onSuccess) onSuccess();
    },
  });

  const fields: FormField<Partial<Product>>[] = [
    {
      name: "name",
      label: "Nombre del Producto",
      type: "text",
      required: true,
      disabled: isViewOnly,
      validate: (value) => {
        if (!value) return "El nombre es obligatorio";
        if (value.length < 3)
          return "El nombre debe tener al menos 3 caracteres";
        return undefined;
      },
    },
    {
      name: "batch_number",
      label: "Número de Lote",
      type: "text",
      required: true,
      disabled: isViewOnly,
      validate: (value) =>
        !value ? "El número de lote es obligatorio" : undefined,
    },
    {
      name: "origin_country",
      label: "País de Origen",
      type: "text",
      required: true,
      disabled: isViewOnly,
      validate: (value) =>
        !value ? "El país de origen es obligatorio" : undefined,
    },
    {
      name: "expiration_date",
      label: "Fecha de Vencimiento",
      type: "date",
      required: true,
      disabled: isViewOnly,
      validate: (value) =>
        !value ? "La fecha de vencimiento es obligatoria" : undefined,
      getValue: (data) => data.expiration_date?.slice(0, 10) || "",
    },
    {
      name: "description",
      label: "Descripción",
      type: "textarea",
      disabled: isViewOnly,
      fullWidth: true,
    },
  ];

  // Valores iniciales
  const initialValues: Partial<Product> = product || {
    name: "",
    batch_number: "",
    origin_country: "",
    expiration_date: "",
    description: "",
  };

  return (
    <Form
      initialValues={initialValues}
      fields={fields}
      onSubmit={mutation.mutate}
      onCancel={onCancel}
      isLoading={mutation.isPending}
      error={mutation.error ? (mutation.error as Error).message : null}
      submitText={mode === "create" ? "Crear Producto" : "Actualizar Producto"}
      layout="grid"
      gridCols={2}
    />
  );
}
