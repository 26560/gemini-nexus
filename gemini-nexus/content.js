
// content.js v7.5
console.log("%c Gemini Nexus v7.5 Ready ", "background: #333; color: #00ff00; font-size: 16px");

// Initialize Helpers
// (Classes are loaded into window scope by previous content scripts in manifest)
const selectionOverlay = new window.GeminiNexusOverlay();
const responseObserver = new window.GeminiNexusObserver();
const floatingToolbar = new window.GeminiFloatingToolbar(); // Initialize Toolbar

// Start observing immediately
responseObserver.start();

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    // Focus Input
    if (request.action === "FOCUS_INPUT") {
        try {
            const inputBox = document.querySelector('div[contenteditable="true"][role="textbox"]');
            if (inputBox) {
                inputBox.focus();
                const selection = window.getSelection();
                if (selection.rangeCount > 0) selection.removeAllRanges();
                sendResponse({status: "ok"});
            } else {
                sendResponse({status: "error", msg: "DOM_NOT_FOUND"});
            }
        } catch (e) {
            sendResponse({status: "error", msg: e.message});
        }
        return true;
    }

    // Start Selection Mode
    if (request.action === "START_SELECTION") {
        selectionOverlay.start();
        sendResponse({status: "selection_started"});
        return true;
    }
});

// Global Shortcut Listeners
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();

        // Ctrl+P: Open Side Panel
        if (key === 'p') {
            e.preventDefault(); 
            e.stopPropagation();
            chrome.runtime.sendMessage({ action: "OPEN_SIDE_PANEL" });
        }

        // Ctrl+Q: Quick Ask Input
        if (key === 'q') {
            e.preventDefault();
            e.stopPropagation();
            floatingToolbar.showGlobalInput();
        }
    }
}, true);
