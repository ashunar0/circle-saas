import { useController } from "react-hook-form";
import type { Control, FieldValues, Path } from "react-hook-form";
import { TextField, Label, Input, FieldError } from "@heroui/react";

interface Props<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  type?: string;
  placeholder?: string;
}

export function FormField<T extends FieldValues>({ control, name, label, type, placeholder }: Props<T>) {
  const { field, fieldState } = useController({ control, name });
  return (
    <TextField name={field.name} value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} type={type} isInvalid={!!fieldState.error}>
      <Label>{label}</Label>
      <Input placeholder={placeholder} />
      {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
    </TextField>
  );
}
