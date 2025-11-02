"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";

export default function SettingsPage() {
  const { success, error } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [qbConnected, setQbConnected] = useState(false);
  const [qbAuthUrl, setQbAuthUrl] = useState("");
  const [testEmail, setTestEmail] = useState("");

  // Password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    // Check QuickBooks connection status
    // TODO: Create endpoint to check QB status
    setIsLoading(false);
  }, []);

  const handleTestEmail = async () => {
    if (!testEmail) {
      error("Please enter an email address");
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail })
      });

      const data = await response.json();

      if (data.ok) {
        success(`Test email sent to ${testEmail}`);
      } else {
        error(data.error || "Failed to send test email");
      }
    } catch (err) {
      error("Failed to send test email");
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnectQuickBooks = async () => {
    try {
      const response = await fetch("/api/quickbooks/auth");
      const data = await response.json();

      if (data.ok && data.auth_url) {
        // Open QuickBooks OAuth in new window
        window.open(data.auth_url, "_blank", "width=800,height=600");
        success("QuickBooks authorization window opened");
      } else {
        error("Failed to get QuickBooks authorization URL");
      }
    } catch (err) {
      error("Failed to connect to QuickBooks");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordData.email) {
      error("Please enter your email address");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      error("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      error("New password must be at least 8 characters long");
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: passwordData.email,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        success("Password changed successfully");
        setPasswordData({
          email: "",
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        error(data.error || "Failed to change password");
      }
    } catch (err) {
      error("Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Change Password</h2>
          <p className="text-sm text-slate-500">Update your account password</p>
        </div>

        <form onSubmit={handleChangePassword} className="border-t pt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email Address *</label>
            <input
              type="email"
              value={passwordData.email}
              onChange={(e) => setPasswordData({ ...passwordData, email: e.target.value })}
              placeholder="your.email@example.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Current Password *</label>
            <input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              placeholder="Enter current password"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">New Password *</label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              placeholder="Enter new password (min 8 characters)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Confirm New Password *</label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              placeholder="Confirm new password"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={isChangingPassword}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChangingPassword ? "Changing Password..." : "Change Password"}
          </button>
        </form>
      </div>

      {/* Email Configuration */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Email Notifications</h2>
            <p className="text-sm text-slate-500">Configure SMTP settings for automated emails</p>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-green-700">Configured</span>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-medium mb-3">Test Email Delivery</h3>
          <div className="flex gap-2">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter email address"
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <button
              onClick={handleTestEmail}
              disabled={isTesting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTesting ? "Sending..." : "Send Test"}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Sends a test email to verify SMTP configuration
          </p>
        </div>

        <div className="border-t pt-4 space-y-2">
          <h3 className="text-sm font-medium">Environment Variables Required:</h3>
          <div className="bg-slate-50 p-3 rounded-lg font-mono text-xs space-y-1">
            <div>EMAIL_HOST=smtp.gmail.com</div>
            <div>EMAIL_PORT=587</div>
            <div>EMAIL_USER=your_email@gmail.com</div>
            <div>EMAIL_PASSWORD=your_app_password</div>
            <div>EMAIL_FROM=noreply@benefitsbuilder.com</div>
          </div>
          <p className="text-xs text-slate-500">
            See <a href="/EMAIL_SETUP_GUIDE.md" className="text-blue-600 hover:underline">EMAIL_SETUP_GUIDE.md</a> for detailed instructions
          </p>
        </div>
      </div>

      {/* QuickBooks Integration */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">QuickBooks Integration</h2>
            <p className="text-sm text-slate-500">Sync invoices and customers to QuickBooks Online</p>
          </div>
          {qbConnected ? (
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-green-700">Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-slate-500">Not Connected</span>
            </div>
          )}
        </div>

        {!qbConnected ? (
          <div className="border-t pt-4">
            <button
              onClick={handleConnectQuickBooks}
              className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
            >
              Connect to QuickBooks
            </button>
            <p className="text-xs text-slate-500 mt-2">
              Authorize Benefits Builder to access your QuickBooks Online account
            </p>
          </div>
        ) : (
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Company Name</span>
              <span className="text-sm font-medium">Your Company LLC</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Last Sync</span>
              <span className="text-sm font-medium">2 hours ago</span>
            </div>
            <button className="text-sm text-red-600 hover:underline">
              Disconnect QuickBooks
            </button>
          </div>
        )}

        <div className="border-t pt-4 space-y-2">
          <h3 className="text-sm font-medium">Environment Variables Required:</h3>
          <div className="bg-slate-50 p-3 rounded-lg font-mono text-xs space-y-1">
            <div>QB_CLIENT_ID=your_quickbooks_client_id</div>
            <div>QB_CLIENT_SECRET=your_quickbooks_client_secret</div>
            <div>QB_REDIRECT_URI=https://your-domain.com/api/quickbooks/callback</div>
            <div>QB_ENVIRONMENT=production</div>
          </div>
          <p className="text-xs text-slate-500">
            See <a href="/QUICKBOOKS_SETUP_GUIDE.md" className="text-blue-600 hover:underline">QUICKBOOKS_SETUP_GUIDE.md</a> for detailed instructions
          </p>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold">System Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
          <div>
            <div className="text-sm text-slate-500">Version</div>
            <div className="font-medium">1.0.0</div>
          </div>
          <div>
            <div className="text-sm text-slate-500">Environment</div>
            <div className="font-medium">Production</div>
          </div>
          <div>
            <div className="text-sm text-slate-500">Database</div>
            <div className="font-medium">Supabase PostgreSQL</div>
          </div>
          <div>
            <div className="text-sm text-slate-500">Deployment</div>
            <div className="font-medium">Vercel</div>
          </div>
        </div>
      </div>

      {/* Documentation Links */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold">Documentation</h2>

        <div className="border-t pt-4 space-y-2">
          <a href="/AUTH_SETUP_GUIDE.md" className="block text-sm text-blue-600 hover:underline">
            Authentication Setup Guide
          </a>
          <a href="/EMAIL_SETUP_GUIDE.md" className="block text-sm text-blue-600 hover:underline">
            Email Notifications Setup Guide
          </a>
          <a href="/QUICKBOOKS_SETUP_GUIDE.md" className="block text-sm text-blue-600 hover:underline">
            QuickBooks Integration Guide
          </a>
          <a href="/DEPLOYMENT_GUIDE.md" className="block text-sm text-blue-600 hover:underline">
            Deployment Guide
          </a>
          <a href="/TAX_DATA_REQUIREMENTS.md" className="block text-sm text-blue-600 hover:underline">
            Tax Data Requirements (CRITICAL)
          </a>
        </div>
      </div>
    </div>
  );
}
