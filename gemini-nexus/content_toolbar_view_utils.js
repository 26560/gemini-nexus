
// content_toolbar_view_utils.js
(function() {
    /**
     * Shared Utility for Positioning Elements
     */
    window.GeminiViewUtils = {
        positionElement: function(el, rect, isLargerWindow, isPinned) {
            // Do not reposition if pinned and already visible
            if (isPinned && el.classList.contains('visible')) return;

            const scrollX = window.scrollX || window.pageXOffset;
            const scrollY = window.scrollY || window.pageYOffset;
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            // 1. Get Dimensions
            let width = el.offsetWidth;
            let height = el.offsetHeight;

            // Fallback for hidden elements (estimate dimensions)
            if (width === 0 || height === 0) {
                width = isLargerWindow ? 400 : 220; 
                height = isLargerWindow ? 300 : 40;
            }

            let left, top;

            if (isLargerWindow) {
                // --- Ask Window (Fixed Positioning) ---
                // We use viewport coordinates directly (no scroll offsets)
                
                // Horizontal: Align left, clamp to viewport
                let relLeft = rect.left;
                // Constraints: margin 10px
                const maxLeft = vw - width - 10;
                const minLeft = 10;
                
                // Clamp
                relLeft = Math.min(Math.max(relLeft, minLeft), maxLeft);
                
                left = relLeft;

                // Vertical: Try Below -> Above -> Clamp
                // Margin 10px
                const spaceBelow = vh - rect.bottom;
                const spaceAbove = rect.top;
                
                let relTop;
                
                // Preference: Below
                if (spaceBelow >= height + 10) {
                    relTop = rect.bottom + 10;
                } 
                // Fallback: Above
                else if (spaceAbove >= height + 10) {
                    relTop = rect.top - height - 10;
                } 
                // Fallback: Whichever has more space, clamped
                else {
                    if (spaceBelow >= spaceAbove) {
                        // Put below, clamped to bottom
                        relTop = vh - height - 10;
                    } else {
                        // Put above, clamped to top
                        relTop = 10;
                    }
                }
                
                top = relTop;

            } else {
                // --- Quick Toolbar (Absolute Positioning) ---
                // We add scroll offsets so it moves with the text
                
                // Horizontal: Center relative to selection
                let relLeft = rect.left + (rect.width / 2);
                
                // Account for CSS transform: translateX(-50%)
                const halfW = width / 2;
                const maxCenter = vw - halfW - 10;
                const minCenter = halfW + 10;
                
                relLeft = Math.min(Math.max(relLeft, minCenter), maxCenter);
                
                left = relLeft + scrollX;

                // Vertical: Above -> Below
                // Default Above
                let relTop = rect.top - height - 10; 
                
                // If not enough space above, go below
                if (rect.top < height + 20) {
                    relTop = rect.bottom + 15;
                }
                
                top = relTop + scrollY;
            }

            el.style.left = `${left}px`;
            el.style.top = `${top}px`;
        }
    };
})();
