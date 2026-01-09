const { ipcRenderer } = require('electron');

// Listen for messages from the web page (media-inject.js)
window.addEventListener('message', (event) => {
    // We expect messages from the same window
    if (event.source !== window) return;

    if (event.data && event.data.type === '__trails_media_state') {
        // Forward as IPC to main process
        ipcRenderer.send('view-media-update', event.data);
    }
});
