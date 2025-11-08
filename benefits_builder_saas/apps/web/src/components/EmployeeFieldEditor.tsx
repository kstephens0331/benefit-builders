"use client";

import { useState } from "react";

type FieldType = "text" | "number" | "select" | "date";

type Props = {
  employeeId: string;
  fieldName: string;
  fieldLabel: string;
  initialValue: string | number | null;
  fieldType: FieldType;
  options?: { value: string; label: string }[]; // For select fields
  min?: number; // For number fields
  max?: number; // For number fields
};

export default function EmployeeFieldEditor({
  employeeId,
  fieldName,
  fieldLabel,
  initialValue,
  fieldType,
  options,
  min,
  max,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const displayValue = initialValue ?? "—";

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      // Parse the value based on field type
      let parsedValue: any = value;

      if (fieldType === "number") {
        parsedValue = value.trim() === "" ? null : parseFloat(value);
        if (parsedValue !== null && isNaN(parsedValue)) {
          setError("Invalid number");
          setSaving(false);
          return;
        }
        if (min !== undefined && parsedValue !== null && parsedValue < min) {
          setError(`Must be at least ${min}`);
          setSaving(false);
          return;
        }
        if (max !== undefined && parsedValue !== null && parsedValue > max) {
          setError(`Must be at most ${max}`);
          setSaving(false);
          return;
        }
      } else if (fieldType === "date") {
        parsedValue = value.trim() === "" ? null : value;
      }

      const response = await fetch("/api/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: employeeId,
          [fieldName]: parsedValue,
        }),
      });

      const result = await response.json();

      if (!result.ok) {
        setError(result.error || "Failed to save");
        setSaving(false);
        return;
      }

      // Success - refresh the page to update calculations
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Failed to save");
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(initialValue?.toString() ?? "");
    setIsEditing(false);
    setError("");
  };

  // Get display label for select fields
  const getDisplayLabel = () => {
    if (fieldType === "select" && options && initialValue) {
      const option = options.find(opt => opt.value === initialValue.toString());
      return option?.label ?? initialValue;
    }
    return displayValue;
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <div className="font-medium">{getDisplayLabel()}</div>
        <button
          onClick={() => setIsEditing(true)}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {fieldType === "select" && options ? (
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="px-2 py-1 border rounded text-sm"
            disabled={saving}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : fieldType === "number" ? (
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-24 px-2 py-1 border rounded text-sm"
            min={min}
            max={max}
            disabled={saving}
          />
        ) : fieldType === "date" ? (
          <input
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="px-2 py-1 border rounded text-sm"
            disabled={saving}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="px-2 py-1 border rounded text-sm"
            disabled={saving}
          />
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? "..." : "Save"}
        </button>
        <button
          onClick={handleCancel}
          disabled={saving}
          className="px-2 py-1 bg-slate-200 text-xs rounded hover:bg-slate-300 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
