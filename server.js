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

app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'aivora_fallback_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 3600000 }
}));

app.use(express.static(__dirname));

// Route 1: GitHub Repositories OAuth Initiate
app.get('/api/auth/github/repo', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;
  
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent('http://localhost:3000/api/auth/github/callback')}&scope=read:user%20repo&state=${state}`;

  res.redirect(githubAuthUrl);
});

// Route 2: GitHub Callback (User ki Sabhi Repositories Fetch)
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

    // User ki sabhi repositories fetch karein (Up to 100 recent repos)
    const repoResponse = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
      headers: {
        'Authorization': `token ${tokenData.access_token}`,
        'User-Agent': 'Aivora-AI-App'
      }
    });

    const repos = await repoResponse.json();

    if (Array.isArray(repos) && repos.length > 0) {
      // Simplified JSON payload of all repos
      const repoList = repos.map(r => ({
        name: r.full_name,
        visibility: r.private ? 'Private' : 'Public',
        branch: r.default_branch,
        url: r.html_url
      }));

      // Base64 encode for clean URL transfer
      const reposEncoded = Buffer.from(JSON.stringify(repoList)).toString('base64');
      res.redirect(`/?repos=${encodeURIComponent(reposEncoded)}`);
    } else {
      res.redirect('/?repos=empty');
    }

  } catch (error) {
    console.error("Backend Error:", error.message);
    res.status(500).send("Internal Server Error during OAuth callback.");
  }
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Aivora AI Server active at: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
