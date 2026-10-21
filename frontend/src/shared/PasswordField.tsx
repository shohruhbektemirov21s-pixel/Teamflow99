import { Eye, EyeOff } from "lucide-react";
import { useState, type ChangeEvent } from "react";

import { T } from "@/shared/text";
import { Field } from "@/shared/ui";

interface Props {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  autoComplete: string;
  hint?: string;
  error?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
}

export function PasswordField({ label, value, onChange, autoComplete, hint, error, required, minLength, placeholder }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {(id, invalid) => (
        <div className="password-input-wrap">
          <input id={id} className="input" type={visible ? "text" : "password"} autoComplete={autoComplete} aria-invalid={invalid} value={value} placeholder={placeholder} onChange={onChange} required={required} minLength={minLength} />
          <button type="button" className="password-toggle" aria-label={visible ? T.auth.hidePassword : T.auth.showPassword} aria-pressed={visible} onClick={() => setVisible((current) => !current)}>
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      )}
    </Field>
  );
}
