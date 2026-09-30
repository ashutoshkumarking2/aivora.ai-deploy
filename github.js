import { OAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

const btnGithubAuth = document.getElementById('btnGithubAuth');

if (btnGithubAuth) {
  btnGithubAuth.addEventListener('click', async () => {
    const provider = new OAuthProvider("github.com");
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      const statusBanner = document.getElementById('statusBanner');
      if (statusBanner) {
        statusBanner.textContent = "GitHub Sign-In Error: " + err.message;
        statusBanner.className = 'status-banner error';
      }
    }
  });
}

export function initGitHubModule(currentUser) {
  const btnConnectRepo = document.getElementById('btnConnectRepo');
  const repoDisplay = document.getElementById('repoDisplay');

  const urlParams = new URLSearchParams(window.location.search);
  const reposEncoded = urlParams.get('repos');

  if (reposEncoded && repoDisplay) {
    if (reposEncoded === 'empty') {
      repoDisplay.style.display = 'block';
      repoDisplay.innerHTML = `<p style="font-size: 13px; color: #888;">No repositories found on this GitHub account.</p>`;
    } else {
      try {
        const binaryString = atob(decodeURIComponent(reposEncoded));
        const bytes = Uint8Array.from(binaryString, char => char.charCodeAt(0));
        const reposJson = new TextDecoder().decode(bytes);
        const reposList = JSON.parse(reposJson);

        renderVercelStyleRepoList(reposList);
      } catch (e) {
        console.error("Failed to parse repository data", e);
      }
    }
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // Dual URL Redirect Handler (Localhost or Production Render)
  if (btnConnectRepo) {
    btnConnectRepo.addEventListener('click', () => {
      if (!currentUser || !currentUser.uid) {
        alert("Please sign in first.");
        return;
      }

      const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:10000'
        : 'https://aivora-ai-deploy.onrender.com';

      window.location.href = `${API_BASE_URL}/api/auth/github/repo?uid=${encodeURIComponent(currentUser.uid)}`;
    });
  }

  function renderVercelStyleRepoList(repos) {
    repoDisplay.style.display = 'block';

    let html = `
      <input type="text" id="repoSearchInput" class="repo-search-bar" placeholder="Search repository..." />
      <div class="vercel-repo-list" id="vercelRepoList">
    `;

    repos.forEach((repo) => {
      html += `
        <div class="vercel-repo-item" data-name="${escapeHtml(repo.name).toLowerCase()}">
          <div class="repo-main-info">
            <svg class="repo-icon" viewBox="0 0 16 16" fill="currentColor">
              <path fill-rule="evenodd" d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 010-1.5h1.75v-2h-8a1 1 0 00-1 1v1h1.75a.75.75 0 010 1.5h-2.5A.75.75 0 012 14.25V2.5zm2.5-1a1 1 0 00-1 1v8.008a2.5 2.5 0 01.8-.183h8.2V1.5H4.5z"/>
            </svg>
            <div class="repo-title-box">
              <a href="${escapeHtml(repo.url)}" target="_blank" class="repo-title-name">${escapeHtml(repo.name)}</a>
              <span class="repo-time-stamp">${escapeHtml(repo.visibility)} • Branch: ${escapeHtml(repo.branch)}</span>
            </div>
          </div>
          <button class="btn-import" onclick="importRepo('${escapeHtml(repo.name)}', '${escapeHtml(repo.branch)}')">Import</button>
        </div>
      `;
    });

    html += `</div>`;
    repoDisplay.innerHTML = html;

    // Real-time Search Algorithm
    const searchInput = document.getElementById('repoSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const items = document.querySelectorAll('.vercel-repo-item');
        items.forEach(item => {
          const name = item.getAttribute('data-name');
          item.style.display = name.includes(query) ? 'flex' : 'none';
        });
      });
    }
  }
}

// Interactive Configured Import View
window.importRepo = function(repoName, branch) {
  const repoDisplay = document.getElementById('repoDisplay');
  if (!repoDisplay) return;

  repoDisplay.innerHTML = `
    <div class="configured-repo-card">
      <div class="configured-header">
        <span class="badge-connected">Configure Deployment</span>
        <button class="btn-secondary-sm" onclick="location.reload()">Change Repo</button>
      </div>
      
      <div style="margin-top: 4px;">
        <h3 style="font-size: 16px; font-weight: 600; color: #1B1B1B;">${escapeHtml(repoName)}</h3>
      </div>

      <!-- Framework Preset Selector -->
      <div class="form-group" style="margin-top: 8px;">
        <label class="form-label">Framework Preset</label>
        <select id="frameworkSelect" class="form-input" style="height: 38px; font-size: 13px;">
          <option value="vite">Vite / React SPA</option>
          <option value="nextjs">Next.js (App Router)</option>
          <option value="nodejs">Node.js API Service</option>
          <option value="static">Static HTML/JS</option>
        </select>
      </div>

      <!-- Branch Selection -->
      <div class="form-group">
        <label class="form-label">Select Branch</label>
        <select id="branchSelect" class="form-input" style="height: 38px; font-size: 13px;">
          <option value="${escapeHtml(branch)}" selected>${escapeHtml(branch)} (default)</option>
          <option value="main">main</option>
          <option value="dev">dev</option>
          <option value="staging">staging</option>
        </select>
      </div>

      <!-- Build Command & Output Directory Settings -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div class="form-group">
          <label class="form-label">Build Command</label>
          <input type="text" id="buildCommand" class="form-input" style="height: 36px; font-size: 12px;" value="npm run build" />
        </div>
        <div class="form-group">
          <label class="form-label">Output Directory</label>
          <input type="text" id="outputDir" class="form-input" style="height: 36px; font-size: 12px;" value="dist" />
        </div>
      </div>

      <!-- Environment Variables Input -->
      <div class="form-group">
        <label class="form-label">Environment Variables (.env)</label>
        <textarea id="envInput" class="form-input" style="height: 55px; padding: 8px; font-family: monospace; font-size: 12px;" placeholder="KEY=VALUE&#10;API_SECRET=xyz"></textarea>
      </div>

      <button id="btnDeployTrigger" class="btn-primary" style="height: 40px; font-size: 13px;" onclick="startBuildProcess('${escapeHtml(repoName)}')">
        Deploy Workspace
      </button>

      <!-- Live Terminal Output Container -->
      <div id="terminalContainer" style="display: none;"></div>
    </div>
  `;
};

// Real-Time Simulated Build Terminal & Deployment Process
window.startBuildProcess = function(repoName) {
  const btnDeploy = document.getElementById('btnDeployTrigger');
  const term = document.getElementById('terminalContainer');
  if (!term) return;

  if (btnDeploy) {
    btnDeploy.disabled = true;
    btnDeploy.style.opacity = '0.6';
    btnDeploy.textContent = 'Building...';
  }

  term.style.display = 'block';
  term.innerHTML = `
    <div class="terminal-card">
      <div class="terminal-header">
        <span class="terminal-dot dot-red"></span>
        <span class="terminal-dot dot-yellow"></span>
        <span class="terminal-dot dot-green"></span>
        <span style="margin-left: auto; font-size: 10px; color: #888;">aivora-ci-engine v2.4</span>
      </div>
      <div class="build-progress-bar-wrap" style="height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-bottom: 10px; overflow: hidden;">
        <div id="progressBar" style="width: 10%; height: 100%; background: #00FF66; transition: width 0.4s ease;"></div>
      </div>
      <div class="terminal-body" id="terminalLogs">
        <p>[00:01] <span style="color:#22c55e;">✔</span> Connecting to GitHub repo: <strong>${escapeHtml(repoName)}</strong>...</p>
      </div>
    </div>
  `;

  const logs = document.getElementById('terminalLogs');
  const progressBar = document.getElementById('progressBar');

  setTimeout(() => {
    if (progressBar) progressBar.style.width = '35%';
    logs.innerHTML += `<p>[00:02] <span style="color:#22c55e;">✔</span> Analyzing dependencies & Framework Preset...</p>`;
  }, 1000);

  setTimeout(() => {
    if (progressBar) progressBar.style.width = '65%';
    logs.innerHTML += `<p>[00:04] <span style="color:#22c55e;">✔</span> Injecting Aivora AI Optimization Engine...</p>`;
    logs.innerHTML += `<p>[00:05] <span style="color:#3b82f6;">ℹ</span> Executing: <code>npm run build</code>...</p>`;
  }, 2200);

  setTimeout(() => {
    if (progressBar) progressBar.style.width = '88%';
    logs.innerHTML += `<p>[00:06] <span style="color:#22c55e;">✔</span> Output generated at <code>/dist</code> successfully.</p>`;
  }, 3500);

  setTimeout(() => {
    if (progressBar) progressBar.style.width = '100%';
    const liveDomain = `https://${repoName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.aivora.app`;
    
    logs.innerHTML += `
      <p>[00:07] <span style="color:#00FF66; font-weight: bold;">🚀 Deployed successfully to production!</span></p>
      <div style="margin-top: 12px; padding: 10px; background: rgba(0,255,102,0.08); border: 1px solid rgba(0,255,102,0.3); border-radius: 8px;">
        <span style="font-size: 11px; color: #AAA; display: block;">Live Preview Link:</span>
        <a href="${liveDomain}" target="_blank" style="color: #00FF66; font-weight: 600; text-decoration: underline; font-size: 13px;">${liveDomain}</a>
      </div>
    `;

    if (btnDeploy) {
      btnDeploy.disabled = false;
      btnDeploy.style.opacity = '1';
      btnDeploy.textContent = 'Re-Deploy Workspace';
    }
  }, 4800);
};

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
