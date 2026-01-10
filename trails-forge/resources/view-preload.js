const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Feature flags state
let browserSettings = {};

// Fetch initial settings
ipcRenderer.invoke('settings:get').then(settings => {
    browserSettings = settings;
    injectNativeExtensions();
});

// and listen for updates
ipcRenderer.on('settings:update', (_, settings) => {
    browserSettings = settings;
    injectNativeExtensions();
});

function injectNativeExtensions() {
    // Feature 1: Scroll to Top
    if (browserSettings.scrollToTop) {
        injectContentScript('scrollToTop.js', 'feature-scroll-to-top');
    } else {
        removeContentScript('feature-scroll-to-top');
    }

    // Feature 2: Cookie Consent Hider
    if (browserSettings.cookieConsentHider) {
        injectContentScript('cookieHider.js', 'feature-cookie-hider');
    } else {
        removeContentScript('feature-cookie-hider');
    }

    // Feature 3: Canvas Defender
    if (browserSettings.canvasDefender) {
        injectContentScript('canvasDefender.js', 'feature-canvas-defender');
    } else {
        removeContentScript('feature-canvas-defender');
    }

    // Feature 4: Hover Zoom
    if (browserSettings.hoverZoom) {
        injectContentScript('hoverZoom.js', 'feature-hover-zoom');
    } else {
        removeContentScript('feature-hover-zoom');
    }

    // Feature 5: SponsorBlock
    if (browserSettings.sponsorBlock) {
        injectContentScript('sponsorBlock.js', 'feature-sponsor-block');
    } else {
        removeContentScript('feature-sponsor-block');
    }
}

function injectContentScript(filename, id) {
    if (document.getElementById(id)) return; // Already injected

    try {
        const scriptPath = path.join(__dirname, 'contentScripts', filename);
        if (fs.existsSync(scriptPath)) {
            const content = fs.readFileSync(scriptPath, 'utf8');
            const script = document.createElement('script');
            script.id = id;
            script.textContent = content;
            // Inject into <html> or <head> or <body>
            (document.head || document.documentElement).appendChild(script);
        }
    } catch (err) {
        console.error(`[Trails] Failed to inject ${filename}:`, err);
    }
}

function removeContentScript(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
    // Note: This only removes the script element, it doesn't undo the JS execution usually.
    // For ScrollToTop, we might need a way to disable it programmatically if we want real-time toggle off.
    // But for now, reload might be needed for full disable, or we update the script to listen for disable events.
    // For simplicity, we just inject.
}


// Listen for messages from the web page (media-inject.js)
window.addEventListener('message', (event) => {
    // We expect messages from the same window
    if (event.source !== window) return;

    if (event.data && event.data.type === '__trails_media_state') {
        // Forward as IPC to main process
        ipcRenderer.send('view-media-update', event.data);
    }
});

// ============= PASSWORD AUTO-DETECT =============
// Detect login form submissions and prompt to save credentials

function detectLoginCredentials(form) {
    let username = null;
    let password = null;
    
    // Find password field
    const passwordInputs = form.querySelectorAll('input[type="password"]');
    if (passwordInputs.length === 0) return null;
    
    // Get password value (use first visible password field)
    for (const pwField of passwordInputs) {
        if (pwField.value && pwField.value.length > 0) {
            password = pwField.value;
            break;
        }
    }
    
    if (!password) return null;
    
    // Find username/email field (look for common patterns)
    const usernameSelectors = [
        'input[type="email"]',
        'input[type="text"][name*="user"]',
        'input[type="text"][name*="email"]',
        'input[type="text"][name*="login"]',
        'input[type="text"][id*="user"]',
        'input[type="text"][id*="email"]',
        'input[type="text"][id*="login"]',
        'input[name="username"]',
        'input[name="email"]',
        'input[name="login"]',
        'input[autocomplete="username"]',
        'input[autocomplete="email"]',
        'input[type="text"]' // Fallback: any text input before password
    ];
    
    for (const selector of usernameSelectors) {
        const input = form.querySelector(selector);
        if (input && input.value && input.value.length > 0) {
            username = input.value;
            break;
        }
    }
    
    // If no username found in form, check all text inputs
    if (!username) {
        const allTextInputs = form.querySelectorAll('input[type="text"], input[type="email"]');
        for (const input of allTextInputs) {
            if (input.value && input.value.length > 0) {
                username = input.value;
                break;
            }
        }
    }
    
    if (!username) return null;
    
    return { username, password };
}

// Listen for form submissions
document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    
    const credentials = detectLoginCredentials(form);
    if (credentials) {
        const website = window.location.hostname;
        ipcRenderer.send('password-detected', {
            website,
            url: window.location.href,
            username: credentials.username,
            password: credentials.password
        });
    }
}, true);

// Also detect programmatic form submissions (for SPAs like React)
const originalSubmit = HTMLFormElement.prototype.submit;
HTMLFormElement.prototype.submit = function() {
    const credentials = detectLoginCredentials(this);
    if (credentials) {
        const website = window.location.hostname;
        ipcRenderer.send('password-detected', {
            website,
            url: window.location.href,
            username: credentials.username,
            password: credentials.password
        });
    }
    return originalSubmit.call(this);
};

// Detect button clicks on forms (for forms without submit events)
document.addEventListener('click', (event) => {
    const button = event.target.closest('button[type="submit"], input[type="submit"], button:not([type])');
    if (!button) return;
    
    const form = button.closest('form');
    if (!form) return;
    
    // Small delay to allow form to be filled
    setTimeout(() => {
        const credentials = detectLoginCredentials(form);
        if (credentials) {
            const website = window.location.hostname;
            ipcRenderer.send('password-detected', {
                website,
                url: window.location.href,
                username: credentials.username,
                password: credentials.password
            });
        }
    }, 100);
}, true);
