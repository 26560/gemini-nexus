
// content/toolbar/controller.js

(function() {
    class ToolbarController {
        constructor() {
            // Dependencies
            this.ui = new window.GeminiToolbarUI();
            this.actions = new window.GeminiToolbarActions(this.ui);
            
            // Sub-Modules
            this.imageDetector = new window.GeminiImageDetector({
                onShow: (rect) => this.ui.showImageButton(rect),
                onHide: () => this.ui.hideImageButton()
            });

            this.streamHandler = new window.GeminiStreamHandler(this.ui, {
                onSessionId: (id) => { this.lastSessionId = id; }
            });

            this.inputManager = new window.GeminiInputManager();
            
            // Selection Observer
            this.selectionObserver = new window.GeminiSelectionObserver({
                onSelection: this.handleSelection.bind(this),
                onClear: this.handleSelectionClear.bind(this),
                onClick: this.handleClick.bind(this)
            });

            // State
            this.visible = false;
            this.currentSelection = "";
            this.lastRect = null;
            this.lastSessionId = null;

            // Bind Action Handler
            this.handleAction = this.handleAction.bind(this);
            
            this.init();
        }

        init() {
            // Initialize UI
            this.ui.build();
            this.ui.setCallbacks({
                onAction: this.handleAction,
                onImageBtnHover: (isHovering) => {
                    if (isHovering) {
                        this.imageDetector.cancelHide();
                    } else {
                        this.imageDetector.scheduleHide();
                    }
                }
            });

            // Restore floating model preference
            chrome.storage.local.get(['gemini_floating_model'], (result) => {
                if (result.gemini_floating_model) {
                    this.ui.setSelectedModel(result.gemini_floating_model);
                }
            });

            // Initialize Modules
            this.imageDetector.init();
            this.streamHandler.init();
        }

        // --- Event Handlers (Delegated from SelectionObserver) ---

        handleClick(e) {
            // If clicking inside our toolbar/window, do nothing
            if (this.ui.isHost(e.target)) return;
            
            // If pinned OR docked, do not hide the window on outside click
            if (this.ui.isPinned || this.ui.isDocked) {
                // Only hide the small selection toolbar if clicking outside
                if (this.visible && !this.ui.isWindowVisible()) {
                    this.hide();
                }
                return;
            }

            this.hide();
        }

        handleSelection(data) {
            const { text, rect, mousePoint } = data;
            this.currentSelection = text;
            this.lastRect = rect;

            // Capture source input element for potential grammar fix
            this.inputManager.capture();

            // Show/hide grammar button based on whether selection is in editable element
            this.ui.showGrammarButton(this.inputManager.hasSource());

            // Show Toolbar
            this.show(rect, mousePoint);
        }

        handleSelectionClear() {
            // Only hide if we aren't currently interacting with the Ask Window
            if (!this.ui.isWindowVisible()) {
                this.currentSelection = "";
                this.inputManager.reset();
                this.hide();
            }
        }

        // --- Action Dispatcher ---

        handleModelChange(model) {
            // Save preference specifically for the floating window
            chrome.storage.local.set({ 'gemini_floating_model': model });
        }

        handleAction(actionType, data) {
            // Get currently selected model from UI
            const currentModel = this.ui.getSelectedModel();

            // --- Copy Selection ---
            if (actionType === 'copy_selection') {
                if (this.currentSelection) {
                    navigator.clipboard.writeText(this.currentSelection)
                        .then(() => this.ui.showCopySelectionFeedback(true))
                        .catch((err) => {
                            console.error("Failed to copy text:", err);
                            this.ui.showCopySelectionFeedback(false);
                        });
                }
                return;
            }

            // --- Image Analysis ---
            if (actionType === 'image_analyze') {
                const img = this.imageDetector.getCurrentImage();
                if (!img) return;
                
                const imgUrl = img.src;
                const rect = img.getBoundingClientRect();

                this.ui.hideImageButton();
                this.lastSessionId = null; // Reset session for new image
                this.actions.handleImageAnalyze(imgUrl, rect, currentModel);
                return;
            }

            // --- Manual Ask (UI Only) ---
            if (actionType === 'ask') {
                if (this.currentSelection) {
                    this.ui.hide(); // Hide small toolbar
                    const isZh = navigator.language.startsWith('zh');
                    this.ui.showAskWindow(this.lastRect, this.currentSelection, isZh ? "询问" : "Ask Gemini");
                }
                return;
            }

            // --- Quick Actions (Translate / Explain / Summarize) ---
            if (['translate', 'explain', 'summarize'].includes(actionType)) {
                if (!this.currentSelection) return;
                this.lastSessionId = null; // Reset session for new quick action
                this.actions.handleQuickAction(actionType, this.currentSelection, this.lastRect, currentModel);
                return;
            }

            // --- Grammar Fix (with source tracking) ---
            if (actionType === 'grammar') {
                if (!this.currentSelection) return;
                this.ui.setGrammarMode(true, this.inputManager.source, this.inputManager.range);
                this.lastSessionId = null; // Reset session for grammar
                this.actions.handleQuickAction(actionType, this.currentSelection, this.lastRect, currentModel);
                return;
            }

            // --- Insert Result ---
            if (actionType === 'insert_result') {
                this.handleInsert(data, false);
                return;
            }

            // --- Replace Result ---
            if (actionType === 'replace_result') {
                this.handleInsert(data, true);
                return;
            }

            // --- Submit Question ---
            if (actionType === 'submit_ask') {
                const question = data; // data is the input text
                const context = this.currentSelection;
                if (question) {
                    this.actions.handleSubmitAsk(question, context, this.lastSessionId, currentModel);
                }
                return;
            }
            
            // --- Retry ---
            if (actionType === 'retry_ask') {
                this.actions.handleRetry();
                return;
            }

            // --- Cancel ---
            if (actionType === 'cancel_ask') {
                this.actions.handleCancel(); // Send cancel to bg
                this.ui.hideAskWindow();
                this.visible = false;
                this.lastSessionId = null; // Reset session
                return;
            }

            // --- Continue Chat ---
            if (actionType === 'continue_chat') {
                this.actions.handleContinueChat(this.lastSessionId);
                this.ui.hideAskWindow();
                this.visible = false;
                this.lastSessionId = null; // Reset session
                return;
            }
        }

        // --- Helper Methods ---

        show(rect, mousePoint) {
            this.lastRect = rect;
            this.ui.show(rect, mousePoint);
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
            const isZh = navigator.language.startsWith('zh');
            this.ui.showAskWindow(rect, null, isZh ? "询问" : "Ask Gemini");

            // Reset state for new question
            this.ui.setInputValue("");
            this.currentSelection = ""; // Ensure context is clear for submission
            this.lastSessionId = null; // Reset session for fresh start
        }

        handleInsert(text, replace) {
            if (!this.inputManager.hasSource()) {
                // Fallback: copy to clipboard instead
                navigator.clipboard.writeText(text).then(() => {
                    this.ui.showError("Text copied to clipboard (not in editable field)");
                }).catch(() => {
                    this.ui.showError("Cannot insert: not in editable field");
                });
                return;
            }

            const success = this.inputManager.insert(text, replace);
            if (success) {
                // Hide Insert/Replace buttons after successful operation
                this.ui.showInsertReplaceButtons(false);
            } else {
                this.ui.showError("Failed to insert text");
            }
        }
    }

    // Export to Window
    window.GeminiToolbarController = ToolbarController;
})();