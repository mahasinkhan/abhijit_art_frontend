// src/components/inventory/PinField.tsx
import Icon from "./Icon";
import { sharedSt } from "./types";

interface Props { value: string; onChange: (v: string) => void; }

export default function PinField({ value, onChange }: Props) {
  return (
    <label style={sharedSt.field}>
      <span style={sharedSt.lbl}>
        <Icon name="lock" size={13} /> Security PIN · required to save
      </span>
      <input
        style={{ ...sharedSt.inp, letterSpacing: 4 }}
        type="password"
        inputMode="numeric"
        autoComplete="one-time-code"
        data-1p-ignore
        data-lpignore
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="••••••"
      />
    </label>
  );
}