import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// Dynamic Base URL Detection
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const IS_PROD = process.env.NODE_ENV === 'production';

if (IS_PROD) {
  app.set('trust proxy', 1);
}

app.use(express.json());
app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET || 'aivora_fallback_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: IS_PROD,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 3600000
  }
}));

app.use(express.static(__dirname));

// Route 1: GitHub Repositories OAuth Initiate
app.get('/api/auth/github/repo', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;

  // Active BASE_URL ke mutabiq dynamic redirect URI set karna
  const redirectUri = `${BASE_URL}/api/auth/github/callback`;
  
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user%20repo&state=${state}`;

  res.redirect(githubAuthUrl);
});

// Route 2: GitHub Callback
app.get('/api/auth/github/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!state || state !== req.session.oauthState) {
    return res.status(403).send('Security error: State mismatch.');
  }
  req.session.oauthState = null;

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      return res.status(400).send('OAuth Token Exchange Failed.');
    }

    const repoResponse = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'User-Agent': 'Aivora-AI-App'
      }
    });

    if (!repoResponse.ok) {
      throw new Error(`GitHub API Error: ${repoResponse.status}`);
    }

    const repos = await repoResponse.json();

    if (Array.isArray(repos) && repos.length > 0) {
      const repoList = repos.map(r => ({
        name: r.full_name,
        visibility: r.private ? 'Private' : 'Public',
        branch: r.default_branch,
        url: r.html_url
      }));

      const reposEncoded = Buffer.from(JSON.stringify(repoList), 'utf-8').toString('base64');
      res.redirect(`/?repos=${encodeURIComponent(reposEncoded)}`);
    } else {
      res.redirect('/?repos=empty');
    }

  } catch (error) {
    console.error("Backend Error:", error.message);
    res.status(500).send("Internal Server Error during OAuth callback.");
  }
});


// Dynamic sitemap.xml Route
app.get('/sitemap.xml', (req, res) => {
  res.header('Content-Type', 'application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://aivora-ai-deploy.onrender.com/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
});

// Dynamic robots.txt Route
app.get('/robots.txt', (req, res) => {
  res.header('Content-Type', 'text/plain');
  res.send(`User-agent: *
Allow: /

Sitemap: https://aivora-ai-deploy.onrender.com/sitemap.xml`);
});

// App Listen Call - SAARE ROUTES KE BAAD BILKUL AAKHIR MEIN
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Aivora AI Server active at: ${BASE_URL}`);
  console.log(`====================================================`);
});

