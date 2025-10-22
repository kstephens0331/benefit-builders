# Benefits Builder - Deployment Guide

## Overview

This guide covers deploying the Benefits Builder SaaS application using **Vercel** (for hosting) and **Supabase** (for database).

## Current Configuration

### Supabase Project
- **Project Name**: benefit-builder-program
- **Project Ref**: `stuaxikfuxzlbzneekua`
- **Region**: us-east-2
- **URL**: https://stuaxikfuxzlbzneekua.supabase.co
- **Status**: ✅ Linked and configured

### Vercel Project
- **Status**: Not yet deployed
- **Framework**: Next.js 15.0.3
- **Build Directory**: apps/web

---

## Prerequisites

### 1. Install CLIs

```bash
# Vercel CLI (if not installed)
npm install -g vercel

# Supabase CLI (if not installed)
# Windows (using Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# macOS (using Homebrew)
brew install supabase/tap/supabase

# Linux
brew install supabase/tap/supabase
```

### 2. Login to Services

```bash
# Login to Vercel
vercel login

# Login to Supabase (if not already logged in)
supabase login
```

---

## Supabase CLI Commands

### Current Setup Status

```bash
# Verify Supabase CLI version
supabase --version
# Current: v2.48.3 (v2.53.6 available)

# List all projects
supabase projects list

# Check current project link
cat supabase/.temp/project-ref
# Output: stuaxikfuxzlbzneekua
```

### Database Management

#### View Database Tables

```bash
# Connect to remote database using psql
supabase db remote --help

# Or use Supabase dashboard
# URL: https://supabase.com/dashboard/project/stuaxikfuxzlbzneekua
```

#### Seed Database

```bash
# Run the seed script (already created)
cd apps/web
npm run seed
```

#### Reset Database (DANGER)

```bash
# This will drop all data!
supabase db reset --linked

# Then re-seed
npm run seed
```

#### Backup Database

```bash
# Create a backup of current schema
supabase db dump --data-only > backup_$(date +%Y%m%d).sql

# Create schema backup
supabase db dump --schema public > schema_backup.sql
```

### Database Schema Management

The current setup uses direct SQL schema management:

- **Schema file**: `supabase/schema.sql`
- **Seed files**: `supabase/seed/*.sql`
- **Applied via**: TypeScript seed script in `apps/web/scripts/seed.ts`

**Note**: We're NOT using Supabase migrations. The schema is managed manually in the Supabase dashboard and `schema.sql` is documentation.

---

## Vercel CLI Commands

### Initial Setup

#### Option 1: Deploy via CLI (Recommended for testing)

```bash
# Navigate to project root
cd "C:\Users\usmc3\OneDrive\Documents\StephensCode Customer Websites\benefits_builders_program\benefits_builder_saas"

# Login to Vercel
vercel login

# Deploy to preview (first time)
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: benefits-builder-saas
# - Which directory: apps/web
# - Override settings? No
```

#### Option 2: Deploy via GitHub (Recommended for production)

1. Push code to GitHub repository
2. Go to https://vercel.com/new
3. Import repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: apps/web
   - **Build Command**: npm run build
   - **Output Directory**: .next
   - **Install Command**: pnpm install

### Environment Variables

Before deploying, add environment variables in Vercel dashboard or via CLI:

```bash
# Via CLI
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Paste: https://stuaxikfuxzlbzneekua.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (from .env.local)

vercel env add NEXT_PUBLIC_SITE_URL production
# Paste: https://your-domain.vercel.app (or custom domain)
```

### Deployment Commands

```bash
# Deploy to preview environment
vercel

# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# View deployment logs
vercel logs [deployment-url]

# Open deployment in browser
vercel open

# Remove a deployment
vercel rm [deployment-url]
```

### Project Management

```bash
# List all projects
vercel projects ls

# Get project info
vercel inspect

# Link local project to Vercel project
vercel link

# Pull environment variables from Vercel
vercel env pull .env.vercel

# Add domain
vercel domains add your-domain.com
```

---

## Deployment Workflow

### First-Time Deployment

1. **Prepare Database**

```bash
# Ensure database is seeded
cd apps/web
npm run seed
```

2. **Test Build Locally**

```bash
# Build the application
npm run build

# Test production build
npm run start

# Verify at http://localhost:3002
```

3. **Deploy to Vercel**

```bash
# From project root
cd ..

# Deploy (will prompt for configuration)
vercel

# Or if using GitHub
# Just push to main branch (if auto-deploy is enabled)
git push origin main
```

4. **Configure Environment Variables**

In Vercel dashboard or via CLI:
- Add all environment variables from `.env.local`
- Set `NEXT_PUBLIC_SITE_URL` to your Vercel URL

5. **Verify Deployment**

```bash
# Visit your deployment URL
# Test endpoints:
# - /api/health
# - /api/analytics/summary
# - /
```

### Continuous Deployment

Once set up via GitHub:

```bash
# Make changes locally
git add .
git commit -m "Your changes"
git push origin main

# Vercel automatically deploys
# Preview deployments for branches
# Production deployment for main
```

### Manual Deployment

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

---

## Database Schema Sync

### Current Approach

The database schema is managed in Supabase dashboard and documented in `supabase/schema.sql`.

**To update schema:**

1. Make changes in Supabase dashboard (https://supabase.com/dashboard/project/stuaxikfuxzlbzneekua/editor)
2. Update `supabase/schema.sql` to match
3. Document changes in git commit

**To seed new data:**

1. Add SQL to `supabase/seed/*.sql` files
2. OR update TypeScript seed script at `apps/web/scripts/seed.ts`
3. Run `npm run seed`

### Migration to Supabase Migrations (Optional Future)

If you want to use Supabase migrations in the future:

```bash
# Initialize migrations
supabase migration new initial_schema

# This creates: supabase/migrations/YYYYMMDDHHMMSS_initial_schema.sql

# Copy schema.sql content into the migration file

# Push to remote
supabase db push

# Future changes
supabase migration new add_new_table
# Edit the generated file
supabase db push
```

---

## Environment Variables

### Development (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://stuaxikfuxzlbzneekua.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SITE_URL=http://localhost:3002
```

### Production (Vercel)

All the same variables, but:
- `NEXT_PUBLIC_SITE_URL` should be your production domain
- Consider enabling Supabase RLS (Row Level Security) for production

---

## Vercel Configuration

### vercel.json

The `vercel.json` file at the root configures:

```json
{
  "version": 2,
  "buildCommand": "cd apps/web && npm run build",
  "devCommand": "cd apps/web && npm run dev",
  "installCommand": "pnpm install",
  "outputDirectory": "apps/web/.next",
  "framework": "nextjs"
}
```

### Build Settings

- **Framework**: Next.js
- **Node Version**: 20.x (automatically detected)
- **Package Manager**: pnpm
- **Build Command**: `cd apps/web && npm run build`
- **Output Directory**: `apps/web/.next`

---

## Monitoring & Debugging

### Vercel Logs

```bash
# View logs for latest deployment
vercel logs

# View logs for specific deployment
vercel logs [deployment-url]

# Follow logs in real-time
vercel logs --follow
```

### Supabase Logs

Access via dashboard:
- https://supabase.com/dashboard/project/stuaxikfuxzlbzneekua/logs/explorer

Or use CLI:
```bash
# Coming in future Supabase CLI versions
supabase logs
```

### Application Health

```bash
# Check health endpoint
curl https://your-app.vercel.app/api/health

# Check analytics
curl https://your-app.vercel.app/api/analytics/summary
```

---

## Custom Domain Setup

### Add Domain to Vercel

```bash
# Via CLI
vercel domains add benefitsbuilder.com

# Or via dashboard
# 1. Go to project settings
# 2. Domains tab
# 3. Add domain
```

### Configure DNS

Add records at your domain registrar:

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com

Type: A (for apex domain)
Name: @
Value: 76.76.21.21
```

### SSL Certificate

Vercel automatically provisions SSL certificates for all domains.

---

## Rollback Deployment

### Via Dashboard

1. Go to Vercel project
2. Click "Deployments"
3. Find previous deployment
4. Click "..." → "Promote to Production"

### Via CLI

```bash
# List deployments
vercel ls

# Promote specific deployment
vercel promote [deployment-url]
```

---

## Troubleshooting

### Build Fails on Vercel

```bash
# Test build locally first
cd apps/web
npm run build

# Check build logs
vercel logs
```

Common issues:
- Missing environment variables
- TypeScript errors
- Package installation issues

### Database Connection Issues

```bash
# Test connection
curl https://stuaxikfuxzlbzneekua.supabase.co/rest/v1/

# Check Supabase status
# https://status.supabase.com/
```

### Supabase CLI Not Linked

```bash
# Re-link project
supabase link --project-ref stuaxikfuxzlbzneekua
```

---

## Production Checklist

Before going live:

- [ ] All environment variables set in Vercel
- [ ] Database seeded with production data
- [ ] Supabase RLS policies enabled (if using)
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Test all API endpoints
- [ ] Test payment/billing flow (if applicable)
- [ ] Error monitoring set up (Sentry, LogRocket, etc.)
- [ ] Analytics configured (Vercel Analytics, Google Analytics, etc.)
- [ ] Backup strategy in place
- [ ] Documentation updated

---

## Quick Reference

### Supabase Commands

```bash
supabase --version               # Check version
supabase projects list           # List all projects
supabase link --project-ref ID   # Link project
supabase status                  # Check local status
cd apps/web && npm run seed      # Seed database
```

### Vercel Commands

```bash
vercel login                     # Login
vercel                           # Deploy to preview
vercel --prod                    # Deploy to production
vercel ls                        # List deployments
vercel logs                      # View logs
vercel env pull                  # Pull environment variables
vercel domains add domain.com    # Add custom domain
```

### Project URLs

- **Local Dev**: http://localhost:3002
- **Supabase Dashboard**: https://supabase.com/dashboard/project/stuaxikfuxzlbzneekua
- **Vercel Dashboard**: https://vercel.com/dashboard (after first deploy)

---

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs

---

**Last Updated**: October 21, 2025
**Supabase Project**: benefit-builder-program (stuaxikfuxzlbzneekua)
**Deployment Status**: Ready to deploy
