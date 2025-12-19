
// content_toolbar_drag.js
(function() {
    /**
     * Module: Drag Behavior
     * Handles draggable window logic
     */
    class DragController {
        constructor(targetEl, handleEl) {
            this.target = targetEl;
            this.handle = handleEl;
            this.isDragging = false;
            this.dragOffset = { x: 0, y: 0 };

            // Bind methods for event listeners
            this.onDrag = this.onDrag.bind(this);
            this.stopDrag = this.stopDrag.bind(this);

            this.init();
        }

        init() {
            this.handle.addEventListener('mousedown', (e) => {
                // Ignore clicks on buttons inside the handle
                if (e.target.closest('button')) return;

                e.preventDefault();
                this.startDrag(e);
            });
        }

        startDrag(e) {
            this.isDragging = true;
            const rect = this.target.getBoundingClientRect();
            
            // Calculate offset within the element
            this.dragOffset.x = e.clientX - rect.left;
            this.dragOffset.y = e.clientY - rect.top;

            // For position: fixed, we use viewport coordinates directly.
            // Do NOT add scrollX/Y.

            this.target.classList.add('dragging');
            this.target.style.left = `${rect.left}px`;
            this.target.style.top = `${rect.top}px`;
            this.target.style.transform = 'none';

            // Attach global listeners
            window.addEventListener('mousemove', this.onDrag);
            window.addEventListener('mouseup', this.stopDrag);
        }

        onDrag(e) {
            if (!this.isDragging) return;
            e.preventDefault();

            // For position: fixed, we use client coordinates.
            const newLeft = e.clientX - this.dragOffset.x;
            const newTop = e.clientY - this.dragOffset.y;

            this.target.style.left = `${newLeft}px`;
            this.target.style.top = `${newTop}px`;
        }

        stopDrag() {
            this.isDragging = false;
            // Remove global listeners
            window.removeEventListener('mousemove', this.onDrag);
            window.removeEventListener('mouseup', this.stopDrag);
        }
        
        reset() {
            this.target.classList.remove('dragging');
            this.target.style.transform = '';
        }
    }

    // Export to Window
    window.GeminiDragController = DragController;
})();
