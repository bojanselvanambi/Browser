// Cookie Consent Hider
// Hides common cookie consent banners and popups

const commonSelectors = [
    '#onetrust-banner-sdk',
    '.onetrust-banner',
    '#cookie-banner',
    '.cookie-banner',
    '[id*="cookie-notice"]',
    '[class*="cookie-notice"]',
    '[id*="cookie-consent"]',
    '[class*="cookie-consent"]',
    '.cc-banner',
    '.cc-window',
    '#gdpr-banner',
    '.gdpr-banner',
    '[aria-label="cookieconsent"]',
    '#accept-cookies',
    '.accept-cookies'
];

function hideCookieBanners() {
    const style = document.createElement('style');
    style.id = 'trails-cookie-hider';
    style.textContent = commonSelectors.join(', ') + ' { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }';
    document.head.appendChild(style);
    
    // Also try to remove elements that might block scrolling
    document.body.style.overflow = 'auto'; // Restore scrolling if blocked by modal
}

if (document.head) {
    hideCookieBanners();
} else {
    document.addEventListener('DOMContentLoaded', hideCookieBanners);
}

// Observe for dynamic additions
const observer = new MutationObserver(() => {
    // Re-apply if style removed or new elements need check (CSS handles most)
    if (!document.getElementById('trails-cookie-hider') && document.head) {
        hideCookieBanners();
    }
});

observer.observe(document.documentElement, { childList: true, subtree: true });
