import type { HTMLAttributes, ReactNode } from "react";

export interface FormFieldProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}
