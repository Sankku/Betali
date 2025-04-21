export interface FormField<T> {
  name: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "email"
    | "password"
    | "date"
    | "select"
    | "checkbox";
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: Array<{ label: string; value: string | number }>;
  validate?: (value: any) => string | undefined;
  className?: string;
  fullWidth?: boolean;
  getValue?: (data: T) => any;
  setValue?: (value: any) => any;
}

export interface FormProps<T> {
  title?: string;
  description?: string;
  initialValues: T;
  fields: FormField<T>[];
  onSubmit: (values: T) => Promise<void> | void;
  submitText?: string;
  cancelText?: string;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
  successMessage?: string | null;
  layout?: "vertical" | "horizontal" | "grid";
  className?: string;
  gridCols?: number;
}