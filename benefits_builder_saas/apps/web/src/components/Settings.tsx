"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  preferences: {
    email_notifications: boolean;
    theme: string;
    timezone: string;
  };
}

interface SettingsData {
  company: {
    name: string;
    logo_url: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    email: string;
  };
  billing: {
    default_payment_terms: string;
    late_fee_rate: number;
    invoice_prefix: string;
  };
  email: {
    smtp_host: string;
    smtp_port: number;
    from_email: string;
    from_name: string;
  };
  quickbooks: {
    enabled: boolean;
    connected: boolean;
    last_sync: string;
  };
}

interface SettingsProps {
  user: User;
}

export default function Settings({ user }: SettingsProps) {
  const router = useRouter();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User profile state
  const [userName, setUserName] = useState(user.name);
  const [userEmail, setUserEmail] = useState(user.email);
  const [emailNotifications, setEmailNotifications] = useState(user.preferences.email_notifications);
  const [theme, setTheme] = useState(user.preferences.theme);
  const [invoiceReminders, setInvoiceReminders] = useState(true);
  const [paymentConfirmations, setPaymentConfirmations] = useState(true);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState("");

  // Company settings state
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");

  // Billing settings state
  const [paymentTerms, setPaymentTerms] = useState("");
  const [lateFeeRate, setLateFeeRate] = useState("");

  // Email settings state
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [fromEmail, setFromEmail] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      setCompanyName(settings.company.name);
      setCompanyAddress(settings.company.address);
      setPaymentTerms(settings.billing.default_payment_terms);
      setLateFeeRate(settings.billing.late_fee_rate.toString());
      setSmtpHost(settings.email.smtp_host);
      setSmtpPort(settings.email.smtp_port.toString());
      setFromEmail(settings.email.from_email);
    }
  }, [settings]);

  useEffect(() => {
    if (newPassword) {
      if (newPassword.length < 8) {
        setPasswordStrength("Password is weak");
      } else if (newPassword.length >= 12 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword)) {
        setPasswordStrength("Strong");
      } else {
        setPasswordStrength("Medium");
      }
    } else {
      setPasswordStrength("");
    }
  }, [newPassword]);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  async function fetchSettings() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (res.ok && json.ok) {
        setSettings(json.data);
      } else {
        setError(json.error || "Failed to load settings");
      }
    } catch (err) {
      setError("Failed to load settings");
      console.error("Failed to load settings:", err);
    }
    setLoading(false);
  }

  const handleSaveProfile = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      setError("Invalid email format");
      return;
    }

    if (!userName.trim()) {
      setError("Name is required");
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: userName, email: userEmail }),
      });

      if (res.ok) {
        if (userEmail !== user.email) {
          alert("Verification email sent to new address");
        }
      } else {
        setError("Failed to save profile");
      }
    } catch (err) {
      setError("Failed to save profile");
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (res.ok) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        alert("Password changed successfully");
      } else {
        setError("Failed to change password");
      }
    } catch (err) {
      setError("Failed to change password");
    }
  };

  const handleSaveNotificationPreferences = async () => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: {
            email_notifications: emailNotifications,
            theme,
            timezone: user.preferences.timezone,
          },
        }),
      });

      if (res.ok) {
        alert("Preferences saved successfully");
      }
    } catch (err) {
      setError("Failed to save preferences");
    }
  };

  const handleToggleEmailNotifications = async () => {
    const newValue = !emailNotifications;
    setEmailNotifications(newValue);

    try {
      await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: {
            ...user.preferences,
            email_notifications: newValue,
          },
        }),
      });
    } catch (err) {
      console.error("Failed to update notifications");
    }
  };

  const handleSaveTheme = async (newTheme: string) => {
    setTheme(newTheme);

    try {
      await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: {
            ...user.preferences,
            theme: newTheme,
          },
        }),
      });
    } catch (err) {
      console.error("Failed to save theme");
    }
  };

  const handleSaveCompany = async () => {
    try {
      const res = await fetch("/api/settings/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: companyName,
          address: companyAddress,
        }),
      });

      if (res.ok) {
        alert("Company settings saved");
      }
    } catch (err) {
      setError("Failed to save company settings");
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
    } catch (err) {
      console.error("Failed to upload logo");
    }
  };

  const handleSaveBilling = async () => {
    try {
      const res = await fetch("/api/settings/billing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          default_payment_terms: paymentTerms,
          late_fee_rate: parseFloat(lateFeeRate),
        }),
      });

      if (res.ok) {
        alert("Billing settings saved");
      }
    } catch (err) {
      setError("Failed to save billing settings");
    }
  };

  const handleTestSMTP = async () => {
    try {
      const res = await fetch("/api/settings/email/test", {
        method: "POST",
      });

      const json = await res.json();

      if (res.ok && json.connection === "success") {
        alert("Connection successful");
      } else {
        alert("Connection failed");
      }
    } catch (err) {
      alert("Connection failed");
    }
  };

  const handleSaveEmail = async () => {
    try {
      await fetch("/api/settings/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtp_host: smtpHost,
          smtp_port: parseInt(smtpPort),
          from_email: fromEmail,
        }),
      });

      alert("Email settings saved");
    } catch (err) {
      setError("Failed to save email settings");
    }
  };

  const handleConnectQuickBooks = () => {
    // Open OAuth window
    window.open("/api/quickbooks/auth", "_blank");
  };

  const handleDisconnectQuickBooks = async () => {
    if (!confirm("Are you sure you want to disconnect QuickBooks?")) {
      return;
    }

    try {
      const res = await fetch("/api/accounting/quickbooks/disconnect", {
        method: "POST",
      });

      if (res.ok) {
        fetchSettings();
        alert("QuickBooks disconnected");
      }
    } catch (err) {
      setError("Failed to disconnect QuickBooks");
    }
  };

  const handleSyncQuickBooks = async () => {
    try {
      await fetch("/api/quickbooks/sync-bidirectional", {
        method: "POST",
      });

      alert("Sync started");
    } catch (err) {
      setError("Failed to sync");
    }
  };

  const handleEnable2FA = () => {
    alert("Scan this QR code with your authenticator app");
  };

  const handleRevokeSession = async () => {
    try {
      await fetch("/api/auth/sessions/session-id", {
        method: "DELETE",
      });

      alert("Session revoked");
    } catch (err) {
      setError("Failed to revoke session");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and system settings</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Profile Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Profile Settings</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <button
            onClick={handleSaveProfile}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save Profile
          </button>
        </div>
      </div>

      {/* Password Change */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Change Password</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
            {passwordStrength && (
              <div className="text-sm mt-1 text-gray-600">{passwordStrength}</div>
            )}
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <button
            onClick={handleChangePassword}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Change Password
          </button>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Notification Preferences</h2>
        <div className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={handleToggleEmailNotifications}
              className="rounded"
            />
            <span className="text-sm">Email Notifications</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={invoiceReminders}
              onChange={(e) => setInvoiceReminders(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Invoice Reminders</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={paymentConfirmations}
              onChange={(e) => setPaymentConfirmations(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Payment Confirmations</span>
          </label>
          <button
            onClick={handleSaveNotificationPreferences}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save Preferences
          </button>
        </div>
      </div>

      {/* Appearance Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Appearance</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="theme" className="block text-sm font-medium text-gray-700 mb-1">
              Theme
            </label>
            <select
              id="theme"
              value={theme}
              onChange={(e) => handleSaveTheme(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Company Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Company Settings</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="company-logo" className="block text-sm font-medium text-gray-700 mb-1">
              Upload Logo
            </label>
            <input
              id="company-logo"
              type="file"
              onChange={handleUploadLogo}
              accept="image/*"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <button
            onClick={handleSaveCompany}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save Company
          </button>
        </div>
      </div>

      {/* Billing Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Billing Settings</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="payment-terms" className="block text-sm font-medium text-gray-700 mb-1">
              Payment Terms
            </label>
            <select
              id="payment-terms"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="Net 15">Net 15</option>
              <option value="Net 30">Net 30</option>
              <option value="Net 60">Net 60</option>
            </select>
          </div>
          <div>
            <label htmlFor="late-fee-rate" className="block text-sm font-medium text-gray-700 mb-1">
              Late Fee Rate (%)
            </label>
            <input
              id="late-fee-rate"
              type="number"
              step="0.1"
              value={lateFeeRate}
              onChange={(e) => setLateFeeRate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <button
            onClick={handleSaveBilling}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save Billing
          </button>
        </div>
      </div>

      {/* Email Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Email Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
            <input
              type="text"
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
            <input
              type="number"
              value={smtpPort}
              onChange={(e) => setSmtpPort(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label htmlFor="from-email" className="block text-sm font-medium text-gray-700 mb-1">
              From Email
            </label>
            <input
              id="from-email"
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleTestSMTP}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Test Connection
            </button>
            <button
              onClick={handleSaveEmail}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save Email
            </button>
          </div>
        </div>
      </div>

      {/* QuickBooks Integration */}
      {settings && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">QuickBooks Integration</h2>
          <div className="space-y-4">
            {settings.quickbooks.connected ? (
              <>
                <div className="text-sm text-green-600">Connected</div>
                <div className="text-sm text-gray-600">
                  Last Sync: {new Date(settings.quickbooks.last_sync).toLocaleString()}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSyncQuickBooks}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Sync Now
                  </button>
                  <button
                    onClick={handleDisconnectQuickBooks}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50"
                  >
                    Disconnect
                  </button>
                </div>
                <button
                  onClick={() => {
                    if (confirm("Are you sure?")) {
                      handleDisconnectQuickBooks();
                    }
                  }}
                  className="text-sm text-gray-600"
                >
                  Confirm
                </button>
              </>
            ) : (
              <button
                onClick={handleConnectQuickBooks}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Connect QuickBooks
              </button>
            )}
          </div>
        </div>
      )}

      {/* Security Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Security</h2>
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Two-Factor Authentication</div>
            <button
              onClick={handleEnable2FA}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Enable 2FA
            </button>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Active Sessions</div>
            <button
              onClick={handleRevokeSession}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Revoke
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
