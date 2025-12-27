// Internal User Authentication Library
// Simple username/password auth for Benefits Builder internal users

import { createServiceClient } from "./supabase";
import { cookies } from "next/headers";
import crypto from "crypto";

const SESSION_COOKIE_NAME = "bb_session";
const SESSION_DURATION_HOURS = 24;

export interface InternalUser {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  role: "super_admin" | "admin" | "rep" | "client" | "user" | "viewer";
  active: boolean;
  last_login_at: string | null;
  assigned_company_id?: string | null; // For client role - their single company
}

/**
 * Check if user has admin-level access (super_admin or admin)
 * These users can see all companies and data
 */
export function isAdmin(user: InternalUser | null): boolean {
  return user?.role === "super_admin" || user?.role === "admin";
}

/**
 * Check if user is a sales rep with limited access
 * Reps can only see their assigned companies
 */
export function isRep(user: InternalUser | null): boolean {
  return user?.role === "rep";
}

/**
 * Check if user is a client (company owner/executive)
 * Clients can only see their ONE assigned company and add/remove employees
 */
export function isClient(user: InternalUser | null): boolean {
  return user?.role === "client";
}

/**
 * Check if user has access to a specific company
 * - Admins can access all companies
 * - Reps can only access their assigned companies
 * - Clients can only access their single assigned company
 */
export async function canAccessCompany(user: InternalUser | null, companyId: string): Promise<boolean> {
  if (!user) return false;
  if (isAdmin(user)) return true;

  // Client can only access their assigned company
  if (isClient(user)) {
    return user.assigned_company_id === companyId;
  }

  // Rep can access companies assigned to them
  if (isRep(user)) {
    const db = createServiceClient();
    const { data: company } = await db
      .from("companies")
      .select("assigned_rep_id")
      .eq("id", companyId)
      .single();
    return company?.assigned_rep_id === user.id;
  }

  return false;
}

/**
 * Get companies filter for current user
 * Returns the user's ID if they're a rep (for filtering), or null for admins (no filter)
 */
export function getRepFilterId(user: InternalUser | null): string | null {
  if (!user) return null;
  if (isAdmin(user)) return null; // Admins see all
  if (isRep(user)) return user.id; // Reps see only assigned
  return null;
}

/**
 * Get client's assigned company ID (for filtering to single company)
 */
export function getClientCompanyId(user: InternalUser | null): string | null {
  if (!user) return null;
  if (isClient(user)) return user.assigned_company_id || null;
  return null;
}

export interface SessionInfo {
  user: InternalUser;
  session_token: string;
  expires_at: string;
}

/**
 * Hash password using SHA-256
 * NOTE: In production, use bcrypt or argon2 for better security
 */
export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

/**
 * Generate secure random session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Authenticate user with username and password
 */
export async function authenticateUser(
  username: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: true; session: SessionInfo } | { success: false; error: string }> {
  const db = createServiceClient();

  // Hash the provided password
  const passwordHash = hashPassword(password);

  // Find user with matching username and password
  const { data: user, error } = await db
    .from("internal_users")
    .select("id, username, full_name, email, role, active, last_login_at, assigned_company_id")
    .eq("username", username)
    .eq("password_hash", passwordHash)
    .single();

  if (error || !user) {
    // Log failed login attempt
    await db.from("audit_log").insert({
      username,
      action: "login_failed",
      resource_type: "auth",
      details: { reason: "Invalid credentials" },
      ip_address: ipAddress,
      user_agent: userAgent
    });

    return { success: false, error: "Invalid username or password" };
  }

  if (!user.active) {
    await db.from("audit_log").insert({
      user_id: user.id,
      username: user.username,
      action: "login_failed",
      resource_type: "auth",
      details: { reason: "Account disabled" },
      ip_address: ipAddress,
      user_agent: userAgent
    });

    return { success: false, error: "Account is disabled" };
  }

  // Create session
  const sessionToken = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + SESSION_DURATION_HOURS);

  const { data: session, error: sessionError } = await db
    .from("user_sessions")
    .insert({
      user_id: user.id,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent
    })
    .select()
    .single();

  if (sessionError) {
    return { success: false, error: "Failed to create session" };
  }

  // Update last login
  try {
    await db.rpc("update_user_last_login", { user_uuid: user.id });
  } catch {
    // Fallback if RPC not available
    await db.from("internal_users")
      .update({ last_login_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  // Log successful login
  await db.from("audit_log").insert({
    user_id: user.id,
    username: user.username,
    action: "login_success",
    resource_type: "auth",
    ip_address: ipAddress,
    user_agent: userAgent
  });

  return {
    success: true,
    session: {
      user,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString()
    }
  };
}

/**
 * Validate session token and return user info
 */
export async function validateSession(sessionToken: string): Promise<InternalUser | null> {
  const db = createServiceClient();

  // Find valid session
  const { data: session, error } = await db
    .from("user_sessions")
    .select("user_id, expires_at")
    .eq("session_token", sessionToken)
    .single();

  if (error || !session) {
    return null;
  }

  // Check expiration
  if (new Date(session.expires_at) < new Date()) {
    // Session expired, delete it
    await db.from("user_sessions").delete().eq("session_token", sessionToken);
    return null;
  }

  // Get user info
  const { data: user } = await db
    .from("internal_users")
    .select("id, username, full_name, email, role, active, last_login_at, assigned_company_id")
    .eq("id", session.user_id)
    .single();

  if (!user || !user.active) {
    return null;
  }

  return user;
}

/**
 * Get current user from session cookie
 */
export async function getCurrentUser(): Promise<InternalUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  return validateSession(sessionToken);
}

/**
 * Logout user (delete session)
 */
export async function logout(sessionToken: string): Promise<void> {
  const db = createServiceClient();

  // Get user info before deleting session for audit log
  const { data: session } = await db
    .from("user_sessions")
    .select("user_id")
    .eq("session_token", sessionToken)
    .single();

  if (session) {
    const { data: user } = await db
      .from("internal_users")
      .select("username")
      .eq("id", session.user_id)
      .single();

    // Log logout
    await db.from("audit_log").insert({
      user_id: session.user_id,
      username: user?.username,
      action: "logout",
      resource_type: "auth"
    });
  }

  // Delete session
  await db.from("user_sessions").delete().eq("session_token", sessionToken);
}

/**
 * Set session cookie
 */
export async function setSessionCookie(sessionToken: string, expiresAt: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    expires: new Date(expiresAt),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
}

/**
 * Clear session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Log user action to audit log
 */
export async function logAuditEvent(
  action: string,
  resourceType?: string,
  resourceId?: string,
  details?: any
): Promise<void> {
  const db = createServiceClient();
  const user = await getCurrentUser();

  await db.from("audit_log").insert({
    user_id: user?.id,
    username: user?.username,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details: details ? JSON.stringify(details) : null
  });
}
