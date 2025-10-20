// apps/web/src/components/ModelBadge.tsx
"use client";

export default function ModelBadge({ code, label }: { code?: string | null; label?: string }) {
  if (!code) return null;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-700"
      title={label || code}
    >
      <span className="font-medium">{code}</span>
      {label ? <span>({label})</span> : null}
    </span>
  );
}
