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

  // Dual URL Redirect Handler
  if (btnConnectRepo) {
    btnConnectRepo.addEventListener('click', () => {
      if (!currentUser || !currentUser.uid) {
        alert("Please sign in first.");
        return;
      }

      // Automatically selects Localhost or Render Production URL
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

window.importRepo = function(repoName, branch) {
  const repoDisplay = document.getElementById('repoDisplay');
  if (!repoDisplay) return;

  repoDisplay.innerHTML = `
    <div class="configured-repo-card">
      <div class="configured-header">
        <span class="badge-connected">✓ Connected to Aivora</span>
        <button class="btn-secondary-sm" onclick="location.reload()">Change</button>
      </div>
      <div>
        <h3 style="font-size: 16px; font-weight: 600; color: #1B1B1B;">${escapeHtml(repoName)}</h3>
        <p style="font-size: 12px; color: #666; margin-top: 4px;">Default Branch: <strong>${escapeHtml(branch)}</strong></p>
      </div>
      <button class="btn-primary" style="margin-top: 8px;" onclick="alert('Deploying ${escapeHtml(repoName)} to Aivora AI workspace...')">
        Deploy Workspace
      </button>
    </div>
  `;
};

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
