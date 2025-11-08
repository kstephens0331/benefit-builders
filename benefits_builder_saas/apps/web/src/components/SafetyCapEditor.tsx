"use client";

import { useState } from "react";

type Props = {
  employeeId: string;
  initialValue: number | null;
  companyDefault: number;
};

export default function SafetyCapEditor({ employeeId, initialValue, companyDefault }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const displayValue = initialValue ?? companyDefault;
  const isUsingDefault = initialValue === null;

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      // Parse the value - empty string means NULL (use company default)
      const numValue = value.trim() === "" ? null : parseFloat(value);

      // Validate
      if (numValue !== null && (isNaN(numValue) || numValue < 0 || numValue > 100)) {
        setError("Must be between 0 and 100");
        setSaving(false);
        return;
      }

      const response = await fetch("/api/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: employeeId,
          safety_cap_percent: numValue,
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

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <div className="font-medium">
          {displayValue.toFixed(1)}%
          {isUsingDefault && (
            <span className="text-xs text-slate-500 ml-2">(company default)</span>
          )}
        </div>
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
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={`${companyDefault} (default)`}
        className="w-24 px-2 py-1 border rounded text-sm"
        min="0"
        max="100"
        step="0.1"
        disabled={saving}
      />
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
      {error && <span className="text-xs text-red-600">{error}</span>}
      {value.trim() === "" && (
        <span className="text-xs text-slate-500">
          (will use company default: {companyDefault}%)
        </span>
      )}
    </div>
  );
}
