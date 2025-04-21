import React, { useState } from "react";
import { Button } from "../../ui/button";
import { Alert } from "../../ui/alert";
import { FormProps, FormField } from "./types";

export function Form<T>({
  title,
  description,
  initialValues,
  fields,
  onSubmit,
  submitText = "Guardar",
  cancelText = "Cancelar",
  onCancel,
  isLoading = false,
  error = null,
  successMessage = null,
  layout = "vertical",
  className = "",
  gridCols = 2,
}: FormProps<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(successMessage);

  const handleChange = (
    name: string,
    value: any,
    validateFn?: (value: any) => string | undefined
  ) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    if (validateFn) {
      const error = validateFn(value);
      if (error) {
        setErrors((prev) => ({
          ...prev,
          [name]: error,
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    fields.forEach((field) => {
      if (field.validate) {
        const value = field.getValue
          ? field.getValue(values)
          : (values as any)[field.name];

        const error = field.validate(value);
        if (error) {
          newErrors[field.name] = error;
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setSuccess(null);

    try {
      await onSubmit(values);
      if (successMessage) {
        setSuccess(successMessage);
      }
    } catch (err: any) {
      console.error("Error al enviar formulario:", err);
    }
  };

  const renderField = (field: FormField<T>) => {
    const value = field.getValue
      ? field.getValue(values)
      : (values as any)[field.name];

    const errorMessage = errors[field.name];

    const commonProps = {
      id: field.name,
      name: field.name,
      disabled: isLoading || field.disabled,
      required: field.required,
      placeholder: field.placeholder,
      className: `${field.className || ""} ${
        errorMessage ? "border-red-500 focus:ring-red-500" : ""
      }`,
    };

    switch (field.type) {
      case "textarea":
        return (
          <textarea
            {...commonProps}
            value={value || ""}
            onChange={(e) =>
              handleChange(field.name, e.target.value, field.validate)
            }
            rows={4}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-500 ${commonProps.className}`}
          />
        );
      case "select":
        return (
          <select
            {...commonProps}
            value={value || ""}
            onChange={(e) =>
              handleChange(field.name, e.target.value, field.validate)
            }
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-500 ${commonProps.className}`}
          >
            <option value="">Seleccionar</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case "checkbox":
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              {...commonProps}
              checked={Boolean(value)}
              onChange={(e) =>
                handleChange(field.name, e.target.checked, field.validate)
              }
              className={`h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 ${commonProps.className}`}
            />
            <span className="ml-2 text-sm">{field.label}</span>
          </div>
        );
      default:
        return (
          <input
            type={field.type}
            {...commonProps}
            value={value !== null && value !== undefined ? value : ""}
            onChange={(e) => {
              const newValue =
                field.type === "number"
                  ? e.target.value
                    ? Number(e.target.value)
                    : ""
                  : e.target.value;
              handleChange(field.name, newValue, field.validate);
            }}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-500 ${commonProps.className}`}
          />
        );
    }
  };

  const getLayoutClass = () => {
    switch (layout) {
      case "horizontal":
        return "space-y-0 grid grid-cols-[200px_1fr] gap-4 items-center";
      case "grid":
        return `grid grid-cols-1 md:grid-cols-${gridCols} gap-x-6 gap-y-4`;
      case "vertical":
      default:
        return "space-y-4";
    }
  };

  const getFieldWrapperClass = () => {
    switch (layout) {
      case "horizontal":
        return "contents";
      default:
        return "";
    }
  };

  return (
    <div className={className}>
      {title && (
        <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>
      )}
      {description && (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      )}

      <div className="mt-4">
        {error && (
          <Alert
            variant="destructive"
            title="Error"
            onClose={() => {}}
            className="mb-4"
          >
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            variant="success"
            title="Éxito"
            onClose={() => setSuccess(null)}
            className="mb-4"
          >
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className={getLayoutClass()}>
          {fields.map((field) => (
            <div
              key={field.name}
              className={`${getFieldWrapperClass()} ${
                field.fullWidth && layout === "grid"
                  ? "md:col-span-" + gridCols
                  : ""
              }`}
            >
              {field.type !== "checkbox" && (
                <label
                  htmlFor={field.name}
                  className={`block text-sm font-medium text-gray-700 ${
                    layout === "horizontal" ? "" : "mb-1"
                  }`}
                >
                  {field.label}
                  {field.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>
              )}

              {renderField(field)}

              {errors[field.name] && (
                <p className="mt-1 text-sm text-red-600">
                  {errors[field.name]}
                </p>
              )}
            </div>
          ))}

          <div
            className={`${layout === "horizontal" ? "col-start-2" : ""} ${
              layout === "grid" ? "md:col-span-" + gridCols : ""
            } mt-6 flex justify-end space-x-3`}
          >
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                {cancelText}
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : submitText}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
