
// content_toolbar.js

class FloatingToolbar {
    constructor() {
        // Dependencies
        this.ui = new window.GeminiToolbarUI();
        
        // Initialize Actions with UI dependency
        this.actions = new window.GeminiToolbarActions(this.ui);
        
        // State
        this.visible = false;
        this.currentSelection = "";
        this.lastRect = null;
        this.lastSessionId = null;
        
        // Image Hover State
        this.hoveredImage = null;
        this.imageButtonTimeout = null;

        // Bind methods
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.handleAction = this.handleAction.bind(this);
        this.onImageHover = this.onImageHover.bind(this);
        this.handleStreamMessage = this.handleStreamMessage.bind(this);
        
        this.init();
    }

    init() {
        // Initialize UI
        this.ui.build();
        this.ui.setCallbacks({
            onAction: this.handleAction,
            onImageBtnHover: (isHovering) => {
                if (isHovering) {
                    // Clear any hide timeout if mouse enters the button
                    if (this.imageButtonTimeout) clearTimeout(this.imageButtonTimeout);
                } else {
                    // Resume hide logic if mouse leaves button (and not back on image)
                    this.scheduleHideImageButton();
                }
            }
        });

        this.attachListeners();
    }

    attachListeners() {
        document.addEventListener('mouseup', this.onMouseUp);
        document.addEventListener('mousedown', this.onMouseDown);
        
        // Delegated Image Hover
        document.addEventListener('mouseover', (e) => this.onImageHover(e, true), true);
        document.addEventListener('mouseout', (e) => this.onImageHover(e, false), true);

        // Listen for Streaming Updates from Background
        chrome.runtime.onMessage.addListener(this.handleStreamMessage);
    }

    handleStreamMessage(request, sender, sendResponse) {
        if (request.action === "GEMINI_STREAM_UPDATE") {
            if (this.ui.isVisible()) {
                // Update result in real-time
                // We don't change the title during stream, just text
                this.ui.showResult(request.text, null);
            }
        }
        
        if (request.action === "GEMINI_STREAM_DONE") {
            const result = request.result;
            
            if (request.sessionId) {
                this.lastSessionId = request.sessionId;
            }

            if (this.ui.isVisible()) {
                if (result && result.status === 'success') {
                    this.ui.showResult(result.text, null);
                } else if (result && result.status === 'error') {
                    this.ui.showError(result.text);
                } else if (!result) {
                    // Cancelled or empty
                    // Do nothing or show cancelled state
                }
            }
        }
    }

    onImageHover(e, isEnter) {
        if (e.target.tagName !== 'IMG') return;

        // Ignore small images (icons, spacers)
        const img = e.target;
        if (img.width < 100 || img.height < 100) return;

        if (isEnter) {
            if (this.imageButtonTimeout) clearTimeout(this.imageButtonTimeout);
            this.hoveredImage = img;
            const rect = img.getBoundingClientRect();
            this.ui.showImageButton(rect);
        } else {
            // Mouse leave
            this.scheduleHideImageButton();
        }
    }

    scheduleHideImageButton() {
        if (this.imageButtonTimeout) clearTimeout(this.imageButtonTimeout);
        this.imageButtonTimeout = setTimeout(() => {
            this.ui.hideImageButton();
            this.hoveredImage = null;
        }, 200); // 200ms delay to allow moving to button
    }

    handleAction(actionType, data) {
        // --- Image Analysis ---
        if (actionType === 'image_analyze') {
            if (!this.hoveredImage) return;
            const imgUrl = this.hoveredImage.src;
            const rect = this.hoveredImage.getBoundingClientRect();

            this.ui.hideImageButton();
            this.actions.handleImageAnalyze(imgUrl, rect);
            return;
        }

        // --- Manual Ask (UI Only) ---
        if (actionType === 'ask') {
            if (this.currentSelection) {
                this.ui.hide(); // Hide small toolbar
                this.ui.showAskWindow(this.lastRect, this.currentSelection);
            }
            return;
        }

        // --- Quick Actions (Translate / Explain) ---
        if (actionType === 'translate' || actionType === 'explain') {
            if (!this.currentSelection) return;
            this.actions.handleQuickAction(actionType, this.currentSelection, this.lastRect);
            return;
        }

        // --- Submit Question ---
        if (actionType === 'submit_ask') {
            const question = data; // data is the input text
            const context = this.currentSelection;
            if (question) {
                this.actions.handleSubmitAsk(question, context);
            }
            return;
        }

        // --- Cancel ---
        if (actionType === 'cancel_ask') {
            this.actions.handleCancel(); // Send cancel to bg
            this.ui.hideAskWindow();
            this.visible = false;
            return;
        }

        // --- Continue Chat ---
        if (actionType === 'continue_chat') {
            this.actions.handleContinueChat(this.lastSessionId);
            this.ui.hideAskWindow();
            this.visible = false;
            return;
        }
    }

    onMouseDown(e) {
        // If clicking inside our toolbar/window, do nothing
        if (this.ui.isHost(e.target)) return;
        
        // If pinned, do not hide the window on outside click
        if (this.ui.isPinned) {
            // Only hide the small selection toolbar if clicking outside
            if (this.visible && !this.ui.isWindowVisible()) {
                this.hide();
            }
            return;
        }

        this.hide();
    }

    onMouseUp(e) {
        // Delay slightly to let selection finalize
        setTimeout(() => {
            const selection = window.getSelection();
            const text = selection.toString().trim();

            if (text.length > 0) {
                this.currentSelection = text;
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                this.show(rect);
            } else {
                // Only hide if we aren't currently interacting with the Ask Window
                if (!this.ui.isWindowVisible()) {
                    this.currentSelection = "";
                    this.hide();
                }
            }
        }, 10);
    }

    show(rect) {
        this.lastRect = rect;
        this.ui.show(rect);
        this.visible = true;
    }

    hide() {
        if (this.ui.isWindowVisible()) return;
        if (!this.visible) return;
        this.ui.hide();
        this.visible = false;
    }

    showGlobalInput() {
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;
        const width = 400; 
        const height = 100;
        
        // Create a virtual rect roughly in the center-top area
        // The window positioning logic prefers to place the window below the target rect.
        const left = (viewportW - width) / 2;
        const top = (viewportH / 2) - 200; 
        
        const rect = {
            left: left,
            top: top,
            right: left + width,
            bottom: top + height,
            width: width,
            height: height
        };

        this.ui.hide(); // Hide small selection toolbar
        
        // Show window with no context
        this.ui.showAskWindow(rect, null);
        
        // Reset state for new question
        this.ui.setAskInputValue("");
        this.ui.showResult("", "Quick Ask");
        this.currentSelection = ""; // Ensure context is clear for submission
    }
}

window.GeminiFloatingToolbar = FloatingToolbar;
