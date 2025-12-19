
// content_toolbar_ui.js

(function() {
    // Import dependencies from global window scope
    const Templates = window.GeminiToolbarTemplates;
    const View = window.GeminiToolbarView;
    const DragController = window.GeminiDragController;

    /**
     * Main UI Controller
     */
    class ToolbarUI {
        constructor() {
            this.host = null;
            this.shadow = null;
            this.view = null;
            this.dragController = null;
            this.callbacks = {};
            this.isBuilt = false;
            this.currentResultText = '';
            this.resizeObserver = null;
        }

        setCallbacks(callbacks) {
            this.callbacks = callbacks;
        }

        build() {
            if (this.isBuilt) return;
            this._createHost();
            this._render();
            
            // Initialize View
            this.view = new View(this.shadow);
            
            this._bindEvents();
            this.isBuilt = true;
        }

        _createHost() {
            this.host = document.createElement('div');
            this.host.id = 'gemini-nexus-toolbar-host';
            Object.assign(this.host.style, {
                position: 'absolute', top: '0', left: '0', width: '0', height: '0',
                zIndex: '2147483647', pointerEvents: 'none'
            });
            document.documentElement.appendChild(this.host);
            this.shadow = this.host.attachShadow({ mode: 'closed' });
        }

        _render() {
            const container = document.createElement('div');
            container.innerHTML = Templates.mainStructure;
            this.shadow.appendChild(container);
        }

        _bindEvents() {
            const { buttons, imageBtn, askInput, askWindow, askHeader } = this.view.elements;
            
            // Toolbar Actions
            buttons.ask.addEventListener('mousedown', (e) => this._trigger(e, 'ask'));
            buttons.translate.addEventListener('mousedown', (e) => this._trigger(e, 'translate'));
            buttons.explain.addEventListener('mousedown', (e) => this._trigger(e, 'explain'));

            // Image Button
            imageBtn.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                this._fireCallback('image_analyze');
            });
            imageBtn.addEventListener('mouseover', () => this._fireCallback('imageBtnHover', true));
            imageBtn.addEventListener('mouseout', () => this._fireCallback('imageBtnHover', false));

            // Window Actions
            buttons.headerClose.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                this._fireCallback('cancel_ask');
            });

            buttons.stop.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                this._fireCallback('cancel_ask'); 
            });

            // Continue Chat Button
            if (buttons.continue) {
                buttons.continue.addEventListener('click', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    this._fireCallback('continue_chat');
                });
            }

            // Copy Button
            if (buttons.copy) {
                buttons.copy.addEventListener('click', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    this._handleCopy();
                });
            }

            // Input Enter Key
            askInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this._handleSubmit(e);
                }
                e.stopPropagation();
            });

            // Prevent event bubbling from window (e.g. text selection on page)
            askWindow.addEventListener('mousedown', (e) => e.stopPropagation());

            // Draggable
            this.dragController = new DragController(askWindow, askHeader);

            // Resizable Memory: Watch for size changes
            this.resizeObserver = new ResizeObserver(entries => {
                for (let entry of entries) {
                    // Only save if the window is currently visible to avoid saving collapsed states
                    if (this.view && this.view.isWindowVisible()) {
                        let width, height;
                        if (entry.borderBoxSize && entry.borderBoxSize.length > 0) {
                            width = entry.borderBoxSize[0].inlineSize;
                            height = entry.borderBoxSize[0].blockSize;
                        } else {
                            width = entry.contentRect.width;
                            height = entry.contentRect.height;
                        }
                        
                        if (width > 50 && height > 50) {
                            this._saveDimensions(width, height);
                        }
                    }
                }
            });
            this.resizeObserver.observe(askWindow);
        }

        _saveDimensions(w, h) {
            chrome.storage.local.set({ 'gemini_nexus_window_size': { w, h } });
        }

        _trigger(e, action) {
            e.preventDefault(); e.stopPropagation();
            this._fireCallback(action);
        }

        _fireCallback(name, ...args) {
            if (name === 'imageBtnHover' && this.callbacks.onImageBtnHover) {
                this.callbacks.onImageBtnHover(...args);
            } else if (this.callbacks.onAction) {
                this.callbacks.onAction(name, ...args);
            }
        }

        _handleSubmit(e) {
            e.preventDefault(); e.stopPropagation();
            const text = this.view.elements.askInput.value.trim();
            if (text) this._fireCallback('submit_ask', text);
        }
        
        async _handleCopy() {
            if (!this.currentResultText) return;
            try {
                await navigator.clipboard.writeText(this.currentResultText);
                this.view.toggleCopyIcon(true);
                setTimeout(() => this.view.toggleCopyIcon(false), 2000);
            } catch (err) {
                console.error("Failed to copy", err);
                this.view.showError("Copy failed.");
            }
        }

        // --- Public API Delegates ---

        show(rect) {
            this.view.showToolbar(rect);
        }

        hide() {
            this.view.hideToolbar();
        }

        showImageButton(rect) {
            this.view.showImageButton(rect);
        }

        hideImageButton() {
            this.view.hideImageButton();
        }

        showAskWindow(rect, contextText) {
            this.view.showAskWindow(rect, contextText, () => this.dragController.reset());
        }

        showLoading(msg) {
            this.view.showLoading(msg);
        }

        showResult(text, title) {
            this.currentResultText = text; // Store for copying
            this.view.showResult(text, title);
        }

        showError(text) {
             this.view.showError(text);
        }

        hideAskWindow() {
            this.view.hideAskWindow();
        }

        setAskInputValue(text) {
            this.view.setInputValue(text);
        }

        isVisible() {
            if (!this.view) return false;
            return this.view.isToolbarVisible() || this.view.isWindowVisible();
        }

        isWindowVisible() {
            if (!this.view) return false;
            return this.view.isWindowVisible();
        }

        isHost(target) {
            if (!this.view) return false;
            return this.view.isHost(target, this.host);
        }
        
        get askWindow() {
            return this.view ? this.view.elements.askWindow : null;
        }

        get isPinned() {
            return this.view ? this.view.isPinned : false;
        }
    }

    // Export to Window
    window.GeminiToolbarUI = ToolbarUI;

})();
