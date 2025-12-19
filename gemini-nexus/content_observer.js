// content_observer.js

class ResponseObserver {
    constructor() {
        this.observer = null;
        this.lastLen = 0;
    }

    start() {
        // If already running, don't restart (or cleanup first)
        if (this.observer) return;

        const targetNode = document.querySelector('main') || document.body;
        if (!targetNode) return;
        
        this.observer = new MutationObserver((mutations) => this.handleMutations(mutations));
        this.observer.observe(targetNode, { childList: true, subtree: true, characterData: true });
    }

    handleMutations(mutations) {
        const responses = document.querySelectorAll('div[id^="model-response-"]');
        if (responses.length > 0) {
            const lastResponse = responses[responses.length - 1];
            const currentText = lastResponse.innerText; 
            
            if (currentText.length > this.lastLen) {
                this.lastLen = currentText.length;
                chrome.runtime.sendMessage({
                    action: "GEMINI_STREAM_REPLY",
                    text: currentText
                });
            }
        }
    }

    stop() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}

// Attach to window so content.js can access it
window.GeminiNexusObserver = ResponseObserver;