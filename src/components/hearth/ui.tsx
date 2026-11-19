import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint ? <span className="text-sm text-muted">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="field-input" />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className="field-input" />;
}

export function AreaInput(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className="field-input h-24 py-3" />;
}

export function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex min-h-11 items-center gap-3 text-base">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 accent-ink"
      />
      <span>{label}</span>
    </label>
  );
}

export function Stat({
  label,
  value,
  tone = "ink",
  note,
}: {
  label: string;
  value: string;
  tone?: "ink" | "pine" | "brass";
  note?: string;
}) {
  const color = tone === "pine" ? "text-pine" : tone === "brass" ? "text-brass" : "text-ink";
  return (
    <div className="min-w-0">
      <p className="text-sm text-muted">{label}</p>
      <p className={`font-display text-3xl tabular-nums ${color}`}>{value}</p>
      {note ? <p className="mt-1 text-sm text-muted">{note}</p> : null}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`border-t border-line py-6 ${className}`}>{children}</section>;
}
