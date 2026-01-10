// SponsorBlock Lite
// Skips sponsored segments on YouTube

(function() {
    if (!location.hostname.includes('youtube.com')) return;

    let videoId = null;
    let segments = [];
    let video = null;

    function getVideoId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('v');
    }

    async function fetchSegments(id) {
        if (!id) return;
        try {
            // Categories: sponsor, selfpromo, interaction, intro, outro, preview, music_offtopic, filler
            // We'll skip sponsor, selfpromo, interaction (subscribe reminders)
            const categories = '["sponsor", "selfpromo", "interaction"]';
            const response = await fetch(`https://sponsor.ajay.app/api/skipSegments?videoID=${id}&categories=${categories}`);
            if (response.ok) {
                segments = await response.json();
                console.log(`[SponsorBlock] Loaded ${segments.length} segments for ${id}`);
                showNotification(`SponsorBlock: Loaded ${segments.length} segments`);
            } else {
                segments = [];
            }
        } catch (err) {
            // 404 means no segments found usually
            segments = [];
        }
    }

    function showNotification(text) {
        // Simple toast or indicator
        // Maybe reuse existing UI or createsmall one
        const el = document.createElement('div');
        el.style.cssText = `
            position: fixed;
            bottom: 60px;
            left: 20px;
            background: #FC93AD;
            color: #000;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 9999;
            opacity: 0.8;
            pointer-events: none;
            transition: opacity 0.5s;
        `;
        el.textContent = text;
        document.body.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 500);
        }, 3000);
    }

    function checkSkip() {
        if (!video || segments.length === 0) return;
        
        const currentTime = video.currentTime;
        for (const segment of segments) {
            // segment: { segment: [start, end], UUID: ..., category: ... }
            if (currentTime >= segment.segment[0] && currentTime < segment.segment[1]) {
                console.log(`[SponsorBlock] Skipping segment ${segment.category} at ${currentTime}`);
                video.currentTime = segment.segment[1];
                showNotification(`Skipped ${segment.category}`);
                return; // Only skip one at a time
            }
        }
    }

    function init() {
        // YouTube uses SPA navigation
        setInterval(() => {
            const newId = getVideoId();
            if (newId !== videoId) {
                videoId = newId;
                segments = [];
                if (videoId) fetchSegments(videoId);
            }
            
            // Re-acquire video element if needed
            if (!video || !document.contains(video)) {
                video = document.querySelector('video');
                if (video) {
                    video.addEventListener('timeupdate', checkSkip);
                }
            }
        }, 1000);
    }

    init();

})();
