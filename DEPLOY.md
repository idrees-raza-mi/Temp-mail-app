# 🚀 Deployment Guide

## Quick Deploy Options

### 1. **Vercel (Recommended for Testing)**
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/tempmail-app)

1. Fork this repository to your GitHub
2. Connect your GitHub to Vercel
3. Deploy with one click
4. Your friend can access: `https://your-app.vercel.app`

### 2. **Netlify (Frontend Only)**
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/yourusername/tempmail-app)

### 3. **Railway (Full App)**
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/yourusername/tempmail-app)

## Setup Instructions

### Step 1: Create GitHub Repository
```bash
git init
git add .
git commit -m "Initial commit - TempMail App"
git branch -M main
git remote add origin https://github.com/yourusername/tempmail-app.git
git push -u origin main
```

### Step 2: Deploy Frontend (GitHub Pages)
1. Go to your GitHub repository
2. Settings > Pages
3. Source: GitHub Actions
4. The app will auto-deploy to: `https://yourusername.github.io/tempmail-app`

### Step 3: Deploy Backend
Choose one of these options:

#### Option A: Railway (Free Tier)
1. Visit [Railway.app](https://railway.app)
2. Connect your GitHub
3. Deploy your repository
4. Set environment variables

#### Option B: Vercel (Serverless)
1. Visit [Vercel.com](https://vercel.com)  
2. Import your GitHub repository
3. Deploy automatically

#### Option C: Render (Free Tier)
1. Visit [Render.com](https://render.com)
2. Connect GitHub
3. Create new Web Service
4. Deploy from repository

## Environment Variables
Set these in your hosting platform:

```env
NODE_ENV=production
PORT=3000
ALLOWED_DOMAINS=your-domain.com,temp.your-domain.com
EMAIL_EXPIRATION_HOURS=24
MAX_EMAILS_PER_ADDRESS=50
```

## Access URLs
After deployment, your friend can access:
- **Frontend**: `https://yourusername.github.io/tempmail-app`
- **Backend API**: `https://your-backend.vercel.app/api`
- **Full App**: `https://your-app.vercel.app` (if using Vercel for everything)

## Notes
- ⚠️ **SMTP**: Most free hosting doesn't support SMTP (port 25)
- 📧 **Email Reception**: May need paid hosting for real email receiving
- 🧪 **Demo Mode**: Works great for testing the interface
- 💰 **Cost**: Free tier available on all platforms

## Troubleshooting
1. **CORS Issues**: Update `FRONTEND_URL` in backend config
2. **API Not Found**: Check if backend is deployed correctly
3. **Domains**: Update domain config in environment variables
