# CLI Quick Reference - Benefits Builder

## Current Project Status

**Supabase**: ✅ Linked to `benefit-builder-program` (stuaxikfuxzlbzneekua)
**Vercel**: ⚠️ Not yet deployed (CLI authenticated required)
**Build**: ✅ Passing
**Database**: ✅ Seeded

---

## Daily Development Commands

### Start Development Server
```bash
cd apps/web
npm run dev
# Access: http://localhost:3002
```

### Build & Test
```bash
cd apps/web
npm run build      # Build for production
npm run start      # Test production build
```

### Seed Database
```bash
cd apps/web
npm run seed       # Populate database with initial data
```

---

## Supabase CLI

### Setup & Authentication
```bash
supabase login                                    # Login to Supabase
supabase projects list                            # List all projects
supabase link --project-ref stuaxikfuxzlbzneekua  # Link this project
```

### Database Operations
```bash
# View project info
cat supabase/.temp/project-ref                    # Show linked project

# Seed database
cd apps/web && npm run seed                       # Run TypeScript seed script

# Access database
# Use Supabase Dashboard: https://supabase.com/dashboard/project/stuaxikfuxzlbzneekua/editor
```

### Backup & Restore
```bash
# Backup (when Supabase CLI updated to latest)
supabase db dump --data-only > backup.sql
supabase db dump --schema public > schema.sql

# Reset database (DANGER - deletes all data)
supabase db reset --linked
```

### Upgrade CLI
```bash
# Check current version
supabase --version
# Current: v2.48.3, Latest: v2.53.6

# Upgrade (Windows with Scoop)
scoop update supabase

# Upgrade (macOS/Linux with Homebrew)
brew upgrade supabase
```

---

## Vercel CLI

### Initial Setup
```bash
# Login (required before first use)
vercel login

# Check who's logged in
vercel whoami

# Link project to Vercel
vercel link
```

### Deployment
```bash
# Deploy to preview (development)
vercel

# Deploy to production
vercel --prod

# Check deployment status
vercel ls                    # List deployments
vercel inspect               # Inspect current project
```

### Environment Variables
```bash
# Pull env vars from Vercel
vercel env pull .env.vercel

# Add environment variable
vercel env add VARIABLE_NAME production

# List environment variables
vercel env ls
```

### Logs & Monitoring
```bash
# View logs
vercel logs                  # Latest deployment
vercel logs [url]            # Specific deployment
vercel logs --follow         # Real-time logs

# Open project in browser
vercel open
```

### Domains
```bash
# Add custom domain
vercel domains add your-domain.com

# List domains
vercel domains ls

# Remove domain
vercel domains rm your-domain.com
```

### Project Management
```bash
# List projects
vercel projects ls

# Remove deployment
vercel rm [deployment-url]

# Promote deployment to production
vercel promote [deployment-url]
```

---

## Git Commands

### Daily Workflow
```bash
# Check status
git status

# Stage changes
git add .

# Commit
git commit -m "Description of changes"

# Push to GitHub (triggers Vercel auto-deploy if configured)
git push origin main
```

### Branch Workflow
```bash
# Create feature branch
git checkout -b feature/new-feature

# Push branch (creates preview deployment in Vercel)
git push origin feature/new-feature

# Merge to main
git checkout main
git merge feature/new-feature
git push origin main
```

---

## NPM/PNPM Commands

### Package Management
```bash
# Install all dependencies
pnpm install

# Add package
pnpm add package-name

# Add dev dependency
pnpm add -D package-name

# Remove package
pnpm remove package-name

# Update packages
pnpm update
```

### Scripts (from apps/web)
```bash
npm run dev        # Start dev server
npm run build      # Build for production
npm run start      # Run production build
npm run lint       # Run ESLint
npm run seed       # Seed database
```

---

## Useful File Locations

```
Project Root
├── apps/web/
│   ├── .env.local              # Environment variables (DO NOT COMMIT)
│   ├── src/
│   │   ├── app/                # Pages and API routes
│   │   ├── lib/                # Business logic
│   │   └── components/         # React components
│   ├── scripts/
│   │   └── seed.ts             # Database seeding script
│   └── package.json            # Dependencies and scripts
├── supabase/
│   ├── schema.sql              # Database schema documentation
│   ├── seed/                   # SQL seed files
│   └── .temp/
│       └── project-ref         # Linked Supabase project ID
├── vercel.json                 # Vercel deployment configuration
├── SETUP.md                    # Comprehensive setup guide
├── DEPLOYMENT.md               # Deployment instructions
└── QUICK_START.md              # Quick start guide
```

---

## Common Tasks

### Add a New Company
1. Visit http://localhost:3002/companies
2. Click "Add Company"
3. Fill in details and save

### Seed Fresh Database
```bash
cd apps/web
npm run seed
```

### Deploy to Production
```bash
# First time
vercel login
vercel --prod

# After that (if using GitHub)
git push origin main
```

### Check Production Logs
```bash
vercel logs --prod
```

### Rollback Deployment
```bash
vercel ls                        # Find previous deployment
vercel promote [deployment-url]  # Promote to production
```

### Pull Latest Code
```bash
git pull origin main
pnpm install                     # Update dependencies
cd apps/web && npm run dev       # Start dev server
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

### Production (set in Vercel)
Same variables, but update `NEXT_PUBLIC_SITE_URL` to production domain.

---

## Troubleshooting

### Port 3002 Already in Use
```bash
# Find and kill process
lsof -ti:3002 | xargs kill -9     # Mac/Linux
netstat -ano | findstr :3002      # Windows (then kill PID)
```

### Vercel Not Authenticated
```bash
vercel login
```

### Supabase Not Linked
```bash
supabase link --project-ref stuaxikfuxzlbzneekua
```

### Build Fails
```bash
# Clear Next.js cache
rm -rf apps/web/.next
cd apps/web && npm run build
```

### Database Connection Issues
```bash
# Verify project is linked
cat supabase/.temp/project-ref

# Check env vars
cat apps/web/.env.local | grep SUPABASE
```

---

## URLs

### Local Development
- **App**: http://localhost:3002
- **API Health**: http://localhost:3002/api/health
- **Analytics**: http://localhost:3002/api/analytics/summary

### Supabase
- **Dashboard**: https://supabase.com/dashboard/project/stuaxikfuxzlbzneekua
- **API**: https://stuaxikfuxzlbzneekua.supabase.co

### Vercel
- **Dashboard**: https://vercel.com/dashboard (after deployment)
- **Production**: (Set after first deployment)

---

## Next Steps

1. **Login to Vercel**:
   ```bash
   vercel login
   ```

2. **Deploy Preview**:
   ```bash
   vercel
   ```

3. **Configure Production Environment Variables** in Vercel dashboard

4. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

5. **Set up Custom Domain** (optional):
   ```bash
   vercel domains add benefitsbuilder.com
   ```

---

**Last Updated**: October 21, 2025
