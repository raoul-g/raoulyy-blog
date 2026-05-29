const themeToggle = document.getElementById('theme-toggle-checkbox');

// 1. Restore state from localStorage on page load
if (localStorage.getItem('theme-override') === 'true') {
    themeToggle.checked = true;
}

// 2. Save state to localStorage whenever the checkbox changes
if (themeToggle) {
    themeToggle.addEventListener('change', (e) => {
        localStorage.setItem('theme-override', e.target.checked);
    });
}

// 3. Set copyright year automatically
document.getElementById('current-year').textContent = new Date().getFullYear();

// 4. Share Article Logic
const shareBtn = document.getElementById('share-btn');

if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
        const shareData = {
            title: document.title,
            url: window.location.href
        };

        // Try native share first (works on mobile and supported desktops)
        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                // User cancelled or failed, do nothing
            }
        } else {
            // Fallback: Copy to clipboard
            try {
                await navigator.clipboard.writeText(window.location.href);
            } catch (err) {
                console.error('Failed to copy URL', err);
            }
        }
    });
}

// 5. GoatCounter Analytics
const analyticsScript = document.createElement('script');
analyticsScript.dataset.goatcounter = "https://raoulyy.goatcounter.com/count";
analyticsScript.async = true;
analyticsScript.src = "//gc.zgo.at/count.js";
document.head.appendChild(analyticsScript);

async function initBacklinksPage() {
  const form = document.getElementById('backlinks-search-form');
  const termField = document.getElementById('backlink-term');
  const resultsContainer = document.getElementById('backlink-results');
  const tagsContainer = document.getElementById('backlink-tags');
  if (!form || !termField || !resultsContainer || !tagsContainer) {
    return;
  }

  let backlinksIndex = null;
  try {
    const response = await fetch('/backlinks-index.json');
    if (!response.ok) {
      throw new Error('Failed to load backlinks index');
    }
    backlinksIndex = await response.json();
  } catch (err) {
    resultsContainer.innerHTML = '<p class="error">Unable to load backlinks index.</p>';
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const initialTerm = params.get('term') || '';

  function normalizeTerm(value) {
    return value.trim().toLowerCase();
  }

  function escapeHtml(value) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function renderTags() {
    const terms = backlinksIndex._terms || [];
    if (!terms.length) {
      tagsContainer.innerHTML = '<p>No indexed keywords available.</p>';
      return;
    }

    tagsContainer.innerHTML = terms.slice(0, 40).map((item) => {
      return `<button type="button" class="backlink-tag" data-term="${escapeHtml(item.term)}">${escapeHtml(item.term)} <span>${item.count}</span></button>`;
    }).join('');
  }

  function renderWelcome() {
    resultsContainer.innerHTML = `
      <div class="backlink-welcome-card">
        <p>Use the search above or click a keyword tag to explore backlinks.</p>
      </div>
    `;
  }

  function renderResults(term) {
    const normalized = normalizeTerm(term);
    if (!normalized) {
      renderWelcome();
      return;
    }

    const entry = backlinksIndex[normalized];
    if (!entry) {
      resultsContainer.innerHTML = `
        <div class="backlink-not-found">
          <p>No backlinks found for <strong>${escapeHtml(term)}</strong>.</p>
          <p>Try another keyword or use the keyword tags below.</p>
        </div>
      `;
      return;
    }

    const mentionItems = entry.mentions.map((mention) => {
      const metaParts = [mention.collection];
      const formattedDate = formatDate(mention.date);
      if (formattedDate) {
        metaParts.push(formattedDate);
      }
      return `
        <li class="backlink-item">
          <div class="backlink-item-title">
            <a href="${escapeHtml(mention.url)}">${escapeHtml(mention.title)}</a>
          </div>
          <p class="backlink-meta">${escapeHtml(metaParts.join(' · '))}</p>
          <p class="backlink-snippet">${escapeHtml(mention.snippet || '').replace(/\n/g, ' ')}</p>
        </li>
      `;
    }).join('');

    resultsContainer.innerHTML = `
      <div class="backlink-result-header">
        <h2>${escapeHtml(entry.term)}</h2>
        <p>${entry.mentions.length} ${entry.mentions.length === 1 ? 'mention' : 'mentions'} found.</p>
      </div>
      <ul class="backlink-list">
        ${mentionItems}
      </ul>
    `;
  }

  function updateQueryParam(term) {
    const url = new URL(window.location.href);
    if (term) {
      url.searchParams.set('term', term);
    } else {
      url.searchParams.delete('term');
    }
    window.history.replaceState({}, '', url.toString());
  }

  function handleTagClick(event) {
    const button = event.target.closest('.backlink-tag');
    if (!button) return;
    const term = button.dataset.term;
    if (!term) return;
    termField.value = term;
    renderResults(term);
    updateQueryParam(term);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const term = termField.value.trim();
    renderResults(term);
    updateQueryParam(term);
  });

  tagsContainer.addEventListener('click', handleTagClick);
  renderTags();

  if (initialTerm) {
    termField.value = initialTerm;
    renderResults(initialTerm);
  } else {
    renderWelcome();
  }
}

initBacklinksPage();