// apps/web/src/app/companies/bulk-upload/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

type UploadResult = {
  ok: boolean;
  company?: {
    id: string;
    name: string;
  };
  employees_created?: number;
  employees_failed?: number;
  employees?: Array<{
    id: string;
    name: string;
    benefits_count: number;
  }>;
  failures?: Array<{
    name: string;
    error: string;
  }>;
  error?: string;
};

export default function BulkUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({
        ok: false,
        error: error.message || 'Upload failed',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bulk Company & Employee Upload</h1>
        <Link
          href="/companies"
          className="px-4 py-2 bg-slate-200 rounded-lg hover:bg-slate-300"
        >
          ← Back to Companies
        </Link>
      </div>

      {/* Instructions */}
      <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
        <h2 className="font-semibold text-blue-900 mb-3">How to Use Bulk Upload</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
          <li>Prepare your Excel file (.xlsx) or CSV with employee census data</li>
          <li>Include company information (company name, state, pay frequency, billing model)</li>
          <li>Include employee information (name, DOB, filing status, dependents, gross pay, state)</li>
          <li>Include benefit elections (HSA, FSA, Dental, Vision, etc.) with amounts per pay period</li>
          <li>Upload the file below - AI will automatically parse and structure the data</li>
        </ol>

        <div className="mt-4 p-4 bg-white rounded border border-blue-300">
          <h3 className="font-semibold text-sm mb-2">Expected Columns (flexible naming):</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            <div>
              <strong>Company:</strong> Company Name, State, Pay Frequency, Billing Model
            </div>
            <div>
              <strong>Employee:</strong> First Name, Last Name, DOB, Filing Status, Dependents
            </div>
            <div>
              <strong>Pay Info:</strong> Gross Pay, State, Tobacco Use
            </div>
            <div>
              <strong>Benefits:</strong> HSA, FSA, Dental, Vision, Life, STD, LTD
            </div>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="font-semibold mb-4">Upload Census File</h2>

        <div className="space-y-4">
          {/* File Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Select Excel or CSV File
            </label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            {file && (
              <p className="mt-2 text-sm text-slate-600">
                Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg
              hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed
              font-semibold transition-colors"
          >
            {uploading ? 'Processing with AI...' : 'Upload and Process'}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className={`p-6 rounded-lg shadow ${
          result.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <h2 className="font-semibold text-lg mb-4">
            {result.ok ? '✓ Upload Successful!' : '✗ Upload Failed'}
          </h2>

          {result.ok && result.company && (
            <div className="space-y-4">
              {/* Company Info */}
              <div className="p-4 bg-white rounded border">
                <h3 className="font-semibold mb-2">Company Created</h3>
                <p className="text-sm">
                  <strong>{result.company.name}</strong>
                </p>
                <Link
                  href={`/companies/${result.company.id}`}
                  className="inline-block mt-2 text-sm text-blue-600 hover:underline"
                >
                  View Company →
                </Link>
              </div>

              {/* Employee Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-100 rounded">
                  <div className="text-2xl font-bold text-green-900">
                    {result.employees_created || 0}
                  </div>
                  <div className="text-sm text-green-700">Employees Created</div>
                </div>
                {result.employees_failed && result.employees_failed > 0 && (
                  <div className="p-4 bg-yellow-100 rounded">
                    <div className="text-2xl font-bold text-yellow-900">
                      {result.employees_failed}
                    </div>
                    <div className="text-sm text-yellow-700">Employees Failed</div>
                  </div>
                )}
              </div>

              {/* Employee List */}
              {result.employees && result.employees.length > 0 && (
                <div className="p-4 bg-white rounded border">
                  <h3 className="font-semibold mb-3">Employees Created</h3>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {result.employees.map((emp) => (
                      <div key={emp.id} className="flex items-center justify-between text-sm p-2 hover:bg-slate-50 rounded">
                        <span>{emp.name}</span>
                        <span className="text-xs text-slate-500">
                          {emp.benefits_count} benefit{emp.benefits_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failures */}
              {result.failures && result.failures.length > 0 && (
                <div className="p-4 bg-yellow-50 rounded border border-yellow-200">
                  <h3 className="font-semibold text-yellow-900 mb-3">Failed to Import</h3>
                  <div className="space-y-2 text-sm">
                    {result.failures.map((failure, idx) => (
                      <div key={idx} className="p-2 bg-white rounded">
                        <div className="font-medium">{failure.name}</div>
                        <div className="text-xs text-red-600">{failure.error}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!result.ok && result.error && (
            <div className="p-4 bg-white rounded border border-red-300">
              <p className="text-red-800">{result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
