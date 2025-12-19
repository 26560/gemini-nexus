
// ui_controller.js

export class UIController {
    constructor(elements) {
        this.historyListEl = elements.historyListEl;
        this.sidebar = elements.sidebar;
        this.sidebarOverlay = elements.sidebarOverlay;
        this.statusDiv = elements.statusDiv;
        this.historyDiv = elements.historyDiv;
        this.inputFn = elements.inputFn;
        this.sendBtn = elements.sendBtn;
        this.historyToggleBtn = elements.historyToggleBtn;
        this.closeSidebarBtn = elements.closeSidebarBtn;
        
        // Image Viewer
        this.imageViewer = elements.imageViewer;
        this.fullImage = elements.fullImage;
        this.closeViewerBtn = elements.closeViewerBtn;
        
        // Settings Modal
        this.settingsBtn = document.getElementById('settings-btn');
        this.settingsModal = document.getElementById('settings-modal');
        this.closeSettingsBtn = document.getElementById('close-settings');

        this.initListeners();
    }

    initListeners() {
        if(this.historyToggleBtn) {
            this.historyToggleBtn.addEventListener('click', () => this.toggleSidebar());
        }
        if(this.closeSidebarBtn) {
            this.closeSidebarBtn.addEventListener('click', () => this.closeSidebar());
        }
        if(this.sidebarOverlay) {
            this.sidebarOverlay.addEventListener('click', () => {
                this.closeSidebar();
                this.closeSettingsModal(); // Also close settings if clicking overlay
            });
        }
        
        // Auto-resize Textarea
        if (this.inputFn) {
            this.inputFn.addEventListener('input', () => {
                this.inputFn.style.height = 'auto';
                this.inputFn.style.height = this.inputFn.scrollHeight + 'px';
            });
        }

        // --- Image Viewer Events ---
        if (this.imageViewer) {
            this.imageViewer.addEventListener('click', (e) => {
                if (e.target === this.imageViewer || e.target === this.closeViewerBtn) {
                    this.closeImageViewer();
                }
            });
            
            if (this.closeViewerBtn) {
                this.closeViewerBtn.addEventListener('click', () => this.closeImageViewer());
            }
        }

        // --- Settings Modal Events ---
        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', () => {
                this.openSettingsModal();
                this.closeSidebar(); // Optional: Close sidebar on mobile/narrow views? Keeping sidebar logic as is.
            });
        }
        
        if (this.closeSettingsBtn) {
            this.closeSettingsBtn.addEventListener('click', () => this.closeSettingsModal());
        }

        if (this.settingsModal) {
            this.settingsModal.addEventListener('click', (e) => {
                if (e.target === this.settingsModal) {
                    this.closeSettingsModal();
                }
            });
        }

        // Global keydown for Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.imageViewer && this.imageViewer.classList.contains('visible')) {
                    this.closeImageViewer();
                } else if (this.settingsModal && this.settingsModal.classList.contains('visible')) {
                    this.closeSettingsModal();
                }
            }
        });

        // Listen for image click events from Renderer
        document.addEventListener('gemini-view-image', (e) => {
            this.openImageViewer(e.detail);
        });
    }

    // --- Settings Modal Logic ---
    openSettingsModal() {
        if (this.settingsModal) {
            this.settingsModal.classList.add('visible');
        }
    }

    closeSettingsModal() {
        if (this.settingsModal) {
            this.settingsModal.classList.remove('visible');
        }
    }

    openImageViewer(src) {
        if (this.fullImage && this.imageViewer) {
            this.fullImage.src = src;
            this.imageViewer.classList.add('visible');
        }
    }

    closeImageViewer() {
        if (this.imageViewer) {
            this.imageViewer.classList.remove('visible');
            setTimeout(() => {
                if(this.fullImage) this.fullImage.src = '';
            }, 300); // clear after transition
        }
    }

    toggleSidebar() {
        if (this.sidebar) this.sidebar.classList.toggle('open');
        if (this.sidebarOverlay) this.sidebarOverlay.classList.toggle('visible');
    }

    closeSidebar() {
        if (this.sidebar) this.sidebar.classList.remove('open');
        if (this.sidebarOverlay) this.sidebarOverlay.classList.remove('visible');
    }

    updateStatus(text) {
        if (this.statusDiv) {
            this.statusDiv.innerText = text;
        }
    }

    clearChatHistory() {
        if (this.historyDiv) this.historyDiv.innerHTML = '';
    }

    scrollToBottom() {
        if (this.historyDiv) {
            setTimeout(() => {
                this.historyDiv.scrollTop = this.historyDiv.scrollHeight;
            }, 50);
        }
    }

    resetInput() {
        if (this.inputFn) {
            this.inputFn.value = '';
            this.inputFn.style.height = 'auto';
            this.inputFn.focus();
        }
    }

    setLoading(isLoading) {
        // Toggle button between Send and Stop
        if(isLoading) {
            this.updateStatus("Gemini is thinking...");
            if (this.sendBtn) {
                // Stop Icon (Square)
                this.sendBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="7" y="7" width="10" height="10" rx="1"/></svg>';
                this.sendBtn.title = "Stop generating";
                this.sendBtn.classList.add('generating');
            }
        } else {
            this.updateStatus("");
            if (this.sendBtn) {
                // Send Icon (Paper plane)
                this.sendBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
                this.sendBtn.title = "Send message";
                this.sendBtn.disabled = false;
                this.sendBtn.classList.remove('generating');
            }
        }
    }

    renderHistoryList(sessions, currentId, callbacks) {
        if (!this.historyListEl) return;
        this.historyListEl.innerHTML = '';
        
        sessions.forEach(s => {
            const item = document.createElement('div');
            item.className = `history-item ${s.id === currentId ? 'active' : ''}`;
            item.onclick = () => {
                callbacks.onSwitch(s.id);
                this.closeSidebar();
            };
            
            const titleSpan = document.createElement('span');
            titleSpan.className = 'history-title';
            titleSpan.textContent = s.title;
            
            const delBtn = document.createElement('span');
            delBtn.className = 'history-delete';
            delBtn.textContent = '✕';
            delBtn.title = "Delete";
            delBtn.onclick = (e) => {
                e.stopPropagation();
                if(confirm("Delete this chat?")) {
                    callbacks.onDelete(s.id);
                }
            };

            item.appendChild(titleSpan);
            item.appendChild(delBtn);
            this.historyListEl.appendChild(item);
        });
    }
}