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