// Hover Zoom
// Enlarge images on hover

(function() {
    let zoomContainer = null;
    let currentImage = null;
    let loading = false;

    function createZoomContainer() {
        if (zoomContainer) return;
        zoomContainer = document.createElement('div');
        zoomContainer.id = 'trails-hover-zoom';
        zoomContainer.style.cssText = `
            position: fixed;
            z-index: 2147483647;
            pointer-events: none;
            background: rgba(0,0,0,0.8);
            border: 2px solid white;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            display: none;
            overflow: hidden;
            max-width: 90vw;
            max-height: 90vh;
        `;
        
        currentImage = document.createElement('img');
        currentImage.style.cssText = `
            display: block;
            max-width: 100%;
            max-height: 90vh;
            object-fit: contain;
        `;
        
        zoomContainer.appendChild(currentImage);
        document.body.appendChild(zoomContainer);
    }

    function getFullSizeUrl(target) {
        if (target.tagName === 'IMG') {
            // Check if wrapped in link to larger image
            const parentLink = target.closest('a');
            if (parentLink && parentLink.href && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(parentLink.href)) {
                return parentLink.href;
            }
            // Check for srcset or just use current src
            // Better to try finding a high-res version if common pattern?
            // For now, just zoom current image
            return target.src;
        } else if (target.tagName === 'A') {
            if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(target.href)) {
                return target.href;
            }
        }
        return null;
    }

    document.addEventListener('mouseover', (e) => {
        const target = e.target;
        const fullUrl = getFullSizeUrl(target);
        
        if (fullUrl) {
            createZoomContainer();
            loading = true;
            // Show loading placeholder?
            // For now just show previous or empty
            
            currentImage.src = fullUrl;
            
            // Only show when loaded to avoid flickering?
            // Or show immediately if cached.
            zoomContainer.style.display = 'block';
            updatePosition(e);
            
            // Allow video?
            /*
            if (/\.(mp4|webm)$/i.test(fullUrl)) {
                // switch to video element
            }
            */
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (zoomContainer && zoomContainer.style.display !== 'none') {
            updatePosition(e);
        }
    });

    document.addEventListener('mouseout', (e) => {
        if (zoomContainer) {
            zoomContainer.style.display = 'none';
            currentImage.src = '';
            loading = false;
        }
    });

    function updatePosition(e) {
        if (!zoomContainer) return;
        
        const offset = 20;
        let left = e.clientX + offset;
        let top = e.clientY + offset;
        
        // Check bounds
        const rect = zoomContainer.getBoundingClientRect();
        if (left + rect.width > window.innerWidth) {
            left = e.clientX - rect.width - offset;
        }
        if (top + rect.height > window.innerHeight) {
            top = e.clientY - rect.height - offset;
        }
        
        // Ensure not off-screen top/left due to flip
        if (left < 0) left = 10;
        if (top < 0) top = 10;

        zoomContainer.style.left = left + 'px';
        zoomContainer.style.top = top + 'px';
    }

})();
