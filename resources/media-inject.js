// Media injection script for controlling video/audio elements
// This script is injected into web pages to enable media controls

(function() {
    'use strict';

    // Find all media elements
    function getMediaElements() {
        const videos = Array.from(document.querySelectorAll('video'));
        const audios = Array.from(document.querySelectorAll('audio'));
        return [...videos, ...audios];
    }

    // Get the primary/active media element (usually the one playing or most prominent)
    function getPrimaryMedia() {
        const elements = getMediaElements();
        // Prefer playing elements
        const playing = elements.find(el => !el.paused);
        if (playing) return playing;
        // Otherwise return the first visible video or audio
        return elements.find(el => {
            if (el.tagName === 'VIDEO') {
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            }
            return true;
        }) || elements[0];
    }

    // Media control functions
    window.__trailsMediaControl = {
        play: function() {
            const media = getPrimaryMedia();
            if (media) media.play();
        },
        pause: function() {
            const media = getPrimaryMedia();
            if (media) media.pause();
        },
        forward: function(seconds = 10) {
            const media = getPrimaryMedia();
            if (media) media.currentTime += seconds;
        },
        backward: function(seconds = 10) {
            const media = getPrimaryMedia();
            if (media) media.currentTime -= seconds;
        },


        getState: function() {
            const media = getPrimaryMedia();
            if (!media) return null;
            return {
                isPlaying: !media.paused,
                currentTime: media.currentTime,
                duration: media.duration || 0,
                volume: media.volume,

            };
        }
    };

    // Report state changes to Electron
    function reportMediaState(action) {
        const state = window.__trailsMediaControl.getState();
        if (state) {
            window.postMessage({ type: '__trails_media_state', action, ...state }, '*');
        }
    }

    // Watch for media events
    function attachListeners(media) {
        if (media.__trailsListenerAttached) return;
        media.__trailsListenerAttached = true;

        media.addEventListener('play', () => reportMediaState('play'));
        media.addEventListener('pause', () => reportMediaState('pause'));
        media.addEventListener('ended', () => reportMediaState('ended'));
        media.addEventListener('timeupdate', () => {
            // Throttle timeupdate reports
            if (!media.__lastReportTime || Date.now() - media.__lastReportTime > 1000) {
                media.__lastReportTime = Date.now();
                reportMediaState('timeupdate');
            }
        });
    }

    // Initial attach
    getMediaElements().forEach(attachListeners);

    // Watch for dynamically added media elements
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.tagName === 'VIDEO' || node.tagName === 'AUDIO') {
                    attachListeners(node);
                }
                if (node.querySelectorAll) {
                    node.querySelectorAll('video, audio').forEach(attachListeners);
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    console.log('[Trails] Media control script loaded');
})();
