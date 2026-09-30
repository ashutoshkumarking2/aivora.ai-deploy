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

  // Vercel-Style Rectangular Full Width Vertical Renderer
  function renderVercelStyleRepoList(repos) {
    repoDisplay.style.display = 'block';

    let html = `
      <input type="text" id="repoSearchInput" class="repo-search-bar" placeholder="Search repository by name..." />
      <div class="vercel-repo-list" id="vercelRepoList">
    `;

    repos.forEach((repo) => {
      // Generate preview homepage or live deployment URL fallback
      const repoGithubUrl = repo.url || `https://github.com/${repo.name}`;
      const repoNameOnly = repo.name.split('/')[1] || repo.name;

      html += `
        <div class="vercel-repo-item" data-name="${escapeHtml(repo.name).toLowerCase()}">
          <div class="repo-main-info">
            <svg class="repo-icon" viewBox="0 0 16 16" fill="currentColor">
              <path fill-rule="evenodd" d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 010-1.5h1.75v-2h-8a1 1 0 00-1 1v1h1.75a.75.75 0 010 1.5h-2.5A.75.75 0 012 14.25V2.5zm2.5-1a1 1 0 00-1 1v8.008a2.5 2.5 0 01.8-.183h8.2V1.5H4.5z"/>
            </svg>
            <div class="repo-title-box">
              <div class="repo-header-line">
                <a href="${escapeHtml(repoGithubUrl)}" target="_blank" class="repo-title-name">${escapeHtml(repo.name)}</a>
                <span class="badge-visibility">${escapeHtml(repo.visibility)}</span>
              </div>
              
              <!-- All Related Links Row -->
              <div class="repo-links-row">
                <a href="${escapeHtml(repoGithubUrl)}" target="_blank" class="repo-link-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  GitHub Source
                </a>
                <span>•</span>
                <span class="repo-branch-info">Branch: <strong>${escapeHtml(repo.branch)}</strong></span>
              </div>
            </div>
          </div>

          <div class="repo-actions-box">
            <button class="btn-import" onclick="importRepo('${escapeHtml(repo.name)}', '${escapeHtml(repo.branch)}', '${escapeHtml(repoGithubUrl)}')">
              Import & Deploy
            </button>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    repoDisplay.innerHTML = html;

    // Search bar filter logic
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

window.importRepo = function(repoName, branch, repoUrl) {
  const repoDisplay = document.getElementById('repoDisplay');
  if (!repoDisplay) return;

  repoDisplay.innerHTML = `
    <div class="configured-repo-card" style="padding: 20px; background: #FFFFFF; border: 1px solid #595F39; border-radius: 8px;">
      <div class="configured-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span class="badge-connected" style="background: #DCFCE7; color: #166534; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700;">✓ Repository Connected</span>
        <button class="btn-secondary-sm" onclick="location.reload()">Back to Repositories</button>
      </div>
      <div>
        <h3 style="font-size: 18px; font-weight: 700; color: #0F172A;">${escapeHtml(repoName)}</h3>
        <p style="font-size: 13px; color: #64748B; margin-top: 4px;">Default Branch: <strong>${escapeHtml(branch)}</strong></p>
        <p style="font-size: 13px; color: #2563EB; margin-top: 2px;">
          <a href="${escapeHtml(repoUrl)}" target="_blank" style="color: #2563EB; text-decoration: underline;">View Source on GitHub</a>
        </p>
      </div>
      <button class="btn-primary" style="margin-top: 16px; width: 100%; height: 44px; font-size: 14px;" onclick="alert('Deploying ${escapeHtml(repoName)} to Aivora AI workspace...')">
        Deploy Workspace Live
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
