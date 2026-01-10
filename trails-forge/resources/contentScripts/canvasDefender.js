// Canvas Fingerprint Defender
// Spoofs canvas fingerprinting by injecting slight noise into canvas data

(function() {
    // Generate a consistent noise for this page load
    // This ensures that multiple calls on the same page return the same (fake) result,
    // which prevents the site from detecting the spoofer easily (instability).
    const noise = {
        r: Math.floor(Math.random() * 4) - 2, // -2 to 1
        g: Math.floor(Math.random() * 4) - 2,
        b: Math.floor(Math.random() * 4) - 2
    };

    // Override toDataURL
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(...args) {
        // If width or height is 0, just return original
        if (this.width === 0 || this.height === 0) {
            return originalToDataURL.apply(this, args);
        }

        // Get context
        const context = this.getContext('2d');
        if (context) {
            // We need to modify the data, but we don't want to change the visible canvas.
            // So we modify, get data, then restore?
            // Or use a temp canvas?
            // Using a temp canvas is safer to avoid visual glitches.
            
            // However, copying to temp canvas might be slow for games.
            // Let's implement a lighter weight approach or accepting the performance hit for privacy.
            // Given "Canvas Defender" name, users expect protection.
            
            // Optimization: Only apply for smaller canvases which are usually used for fingerprinting.
            // Fingerprinting canvases are often hidden or small.
            // But some are large.
            
            try {
                const imageData = context.getImageData(0, 0, this.width, this.height);
                // Modify a few pixels
                for (let i = 0; i < imageData.data.length; i += 100) { // arbitrary spacing
                    if (i % 4 === 3) continue; // skip alpha
                    imageData.data[i] = imageData.data[i] + noise.r;
                }
                
                // Create temp canvas
                // Note: creating new elements might startle some detectors, but it's standard.
                // Actually, if we just want to spoof the output string, we can do it on the dataurl string?
                // No, that corrupts the image file format.
                
                // Let's rely on getImageData being hooked?
                // No, toDataURL is native code, it won't call our JS hooked getImageData.
            } catch (e) {
                // If CORS tainted, we can't read it anyway, so just return original (which will throw or return empty)
                return originalToDataURL.apply(this, args);
            }
        }
        
        // Simple spoof:
        // Return original but modify it? No.
        
        // Let's use the standard spoofing technique:
        // 1. Draw to offscreen canvas
        // 2. Add noise
        // 3. native toDataURL on offscreen canvas
        
        try {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.width;
            tempCanvas.height = this.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(this, 0, 0);
            
            const imageData = tempCtx.getImageData(0, 0, this.width, this.height);
            // Apply noise to a subset of pixels to be fast
            for (let i = 0; i < imageData.data.length; i += Math.max(1, Math.floor(imageData.data.length / 100))) {
                 if ((i % 4) === 3) continue; // alpha
                 imageData.data[i] = Math.min(255, Math.max(0, imageData.data[i] + noise.r));
            }
            tempCtx.putImageData(imageData, 0, 0);
            
            return originalToDataURL.apply(tempCanvas, args);
        } catch (e) {
            // Fallback
            return originalToDataURL.apply(this, args);
        }
    };

    // Override getImageData
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function(...args) {
        try {
            const imageData = originalGetImageData.apply(this, args);
            // Add noise
             for (let i = 0; i < imageData.data.length; i += Math.max(1, Math.floor(imageData.data.length / 100))) {
                 if ((i % 4) === 3) continue; // alpha
                 imageData.data[i] = Math.min(255, Math.max(0, imageData.data[i] + noise.r));
            }
            return imageData;
        } catch (e) {
            throw e;
        }
    };
    
    // Also override isPointInPath for vector fingerprinting? 
    // Maybe later.
})();
