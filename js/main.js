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
const feedback = document.getElementById('share-feedback');

if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
        const shareData = {
            title: document.title,
            text: document.querySelector('meta[name="description"]')?.content || '',
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
                if (feedback) {
                    feedback.style.opacity = '1';
                    setTimeout(() => { feedback.style.opacity = '0'; }, 2000);
                }
            } catch (err) {
                console.error('Failed to copy URL', err);
            }
        }
    });
}