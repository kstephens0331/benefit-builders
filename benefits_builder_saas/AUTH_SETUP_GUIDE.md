# Authentication System Setup Guide

## Overview

A simple username/password authentication system has been added to protect all pages and API routes. This is for **internal Benefits Builder use only** with 4 preset user accounts.

---

## Quick Start

### Step 1: Apply Database Migration

**Option A: Supabase Dashboard (Recommended)**
1. Go to [Supabase Dashboard](https://supabase.com) → Your Project → SQL Editor
2. Copy the entire contents of [supabase/migrations/003_add_auth_users.sql](supabase/migrations/003_add_auth_users.sql)
3. Paste and click **RUN**

**Option B: Command Line (if supabase CLI is configured)**
```bash
cd supabase
supabase db push
```

This creates 3 tables:
- `internal_users` - User accounts
- `user_sessions` - Active login sessions
- `audit_log` - Complete audit trail of all user actions

---

### Step 2: Create User Accounts

Run the setup script to create the 4 user accounts:

```bash
cd apps/web
npx tsx scripts/setup-users.ts
```

This will create:

**Active User:**
- Username: `info@stephenscode.dev`
- Password: `78410889Ks!`
- Role: `admin`
- Status: ✅ Active

**Inactive Users (Awaiting Credentials from Bill):**
- `user2@benefitsbuilder.com` - role: `user` - Status: ⚠️ Disabled
- `user3@benefitsbuilder.com` - role: `user` - Status: ⚠️ Disabled
- `user4@benefitsbuilder.com` - role: `viewer` - Status: ⚠️ Disabled

---

### Step 3: Test Login

1. Navigate to your deployment URL or run locally:
   ```bash
   cd apps/web
   pnpm dev
   ```

2. Visit `http://localhost:3002` (or your deployment URL)

3. You will be **automatically redirected** to `/login`

4. Log in with:
   - Username: `info@stephenscode.dev`
   - Password: `78410889Ks!`

5. After successful login, you'll be redirected to the home page

---

## Features Implemented

### 1. Route Protection
- **All pages and API routes** are protected by authentication
- Unauthenticated users are **automatically redirected** to `/login`
- After login, users are redirected back to their original destination

### 2. Session Management
- **24-hour session duration**
- Secure HTTP-only cookies
- Automatic session expiration cleanup
- Session validation on every request

### 3. Audit Logging
- **Every login/logout** is logged with IP address and user agent
- All user actions can be tracked
- Failed login attempts are recorded
- Supports compliance and security monitoring

### 4. User Roles
- **admin** - Full access to all features
- **user** - Standard access
- **viewer** - Read-only access

(Role-based permissions can be implemented as needed)

---

## Security Features

1. **Password Hashing**: SHA-256 hashing (can upgrade to bcrypt/argon2 for production)
2. **HTTP-Only Cookies**: Session tokens not accessible via JavaScript
3. **Automatic Session Expiration**: 24-hour sessions with cleanup
4. **Audit Trail**: Complete log of all authentication events
5. **IP & User Agent Tracking**: Security monitoring and anomaly detection
6. **Failed Login Logging**: Track brute force attempts

---

## Managing Users

### To Activate Inactive Users

Once you receive credentials from Bill for users 2-4:

1. Open Supabase Dashboard → Table Editor → `internal_users`
2. Find the user (e.g., `user2@benefitsbuilder.com`)
3. Click Edit
4. Update:
   - `username`: (new username if needed)
   - `full_name`: (actual name)
   - `email`: (actual email)
   - `active`: Change to `true`
5. Click Save

Then update the password:

```bash
# Edit scripts/setup-users.ts
# Change the password for the user
# Re-run the script
npx tsx scripts/setup-users.ts
```

### To Change a Password

**Option 1: Via Script** (Recommended)
1. Edit `apps/web/scripts/setup-users.ts`
2. Change the password for the user
3. Run: `npx tsx scripts/setup-users.ts`

**Option 2: Via Database**
1. Hash the new password:
   ```bash
   node -e "console.log(require('crypto').createHash('sha256').update('NewPassword123!').digest('hex'))"
   ```
2. Update in Supabase Dashboard:
   - Table: `internal_users`
   - Column: `password_hash`
   - Value: (paste the hash)

### To Add More Users

Edit `scripts/setup-users.ts` and add to the `users` array:

```typescript
{
  username: "newuser@benefitsbuilder.com",
  password: "SecurePassword123!",
  full_name: "New User Name",
  email: "newuser@benefitsbuilder.com",
  role: "user",
  active: true
}
```

Then run: `npx tsx scripts/setup-users.ts`

---

## Files Added

### Database
- [supabase/migrations/003_add_auth_users.sql](supabase/migrations/003_add_auth_users.sql) - Database schema for auth

### Backend
- [apps/web/src/lib/auth.ts](apps/web/src/lib/auth.ts) - Authentication library
- [apps/web/src/middleware.ts](apps/web/src/middleware.ts) - Route protection middleware
- [apps/web/src/app/api/auth/login/route.ts](apps/web/src/app/api/auth/login/route.ts) - Login endpoint
- [apps/web/src/app/api/auth/logout/route.ts](apps/web/src/app/api/auth/logout/route.ts) - Logout endpoint

### Frontend
- [apps/web/src/app/login/page.tsx](apps/web/src/app/login/page.tsx) - Login page UI

### Scripts
- [apps/web/scripts/setup-users.ts](apps/web/scripts/setup-users.ts) - User creation script

---

## Audit Log Usage

### View All Login Activity

```sql
SELECT
  username,
  action,
  created_at,
  ip_address
FROM audit_log
WHERE action IN ('login_success', 'login_failed', 'logout')
ORDER BY created_at DESC
LIMIT 50;
```

### View Failed Login Attempts

```sql
SELECT
  username,
  created_at,
  ip_address,
  details->>'reason' as reason
FROM audit_log
WHERE action = 'login_failed'
ORDER BY created_at DESC;
```

### View User Activity

```sql
SELECT
  action,
  resource_type,
  created_at
FROM audit_log
WHERE user_id = 'USER_UUID_HERE'
ORDER BY created_at DESC;
```

---

## Troubleshooting

### Issue: "Invalid username or password"
- Verify username is exact (case-sensitive)
- Verify password is exact
- Check that user is marked `active = true` in database

### Issue: Redirected to login after logging in
- Check browser console for errors
- Verify session cookie is being set
- Check `user_sessions` table for active session

### Issue: Migration fails
- Verify Supabase credentials in `.env.local`
- Run SQL directly in Supabase Dashboard SQL Editor
- Check for existing table conflicts

---

## Next Steps

1. ✅ Authentication system complete
2. ✅ Audit logging implemented
3. 🔄 Get remaining user credentials from Bill
4. 📧 Email notification system (next task)
5. 📊 Advanced reporting with scheduling
6. 💼 QuickBooks integration

---

**System Status**: 🟢 **AUTHENTICATION READY**

The login system is fully functional. All pages and API routes are now protected. Only authenticated users can access the system.
