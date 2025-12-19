
// sandbox.js
import { ImageManager } from './image_manager.js';
import { SessionManager } from './session_manager.js';
import { UIController } from './ui_controller.js';
import { AppController } from './app_controller.js';
import { sendToBackground, requestSessionsFromStorage } from './messaging.js';

// --- Initialization ---

let app;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Managers
    const sessionManager = new SessionManager();
    
    const ui = new UIController({
        historyListEl: document.getElementById('history-list'),
        sidebar: document.getElementById('history-sidebar'),
        sidebarOverlay: document.getElementById('sidebar-overlay'),
        statusDiv: document.getElementById('status'),
        historyDiv: document.getElementById('chat-history'),
        inputFn: document.getElementById('prompt'),
        sendBtn: document.getElementById('send'),
        historyToggleBtn: document.getElementById('history-toggle'),
        closeSidebarBtn: document.getElementById('close-sidebar'),
        // Image Viewer Elements
        imageViewer: document.getElementById('image-viewer'),
        fullImage: document.getElementById('full-image'),
        closeViewerBtn: document.querySelector('.close-viewer')
    });

    const imageManager = new ImageManager({
        imageInput: document.getElementById('image-input'),
        imagePreview: document.getElementById('image-preview'),
        previewThumb: document.getElementById('preview-thumb'),
        removeImgBtn: document.getElementById('remove-img'),
        inputWrapper: document.querySelector('.input-wrapper'),
        inputFn: document.getElementById('prompt')
    }, {
        onUrlDrop: (url) => {
            ui.updateStatus("Loading image...");
            sendToBackground({ action: "FETCH_IMAGE", url: url });
        }
    });

    // 2. Initialize Controller
    app = new AppController(sessionManager, ui, imageManager);

    // 3. Configure Marked
    if (typeof marked !== 'undefined') {
        marked.setOptions({ breaks: true, gfm: true });
    }

    // 4. Bind Global Events
    bindAppEvents(app, ui);
    
    // 5. Start
    requestSessionsFromStorage();
});


// --- Event Binding ---

function bindAppEvents(app, ui) {
    // New Chat Buttons
    document.getElementById('new-chat-btn').addEventListener('click', () => app.handleNewChat());
    document.getElementById('new-chat-header-btn').addEventListener('click', () => app.handleNewChat());

    // Tools
    document.getElementById('ocr-btn').addEventListener('click', () => {
        app.setCaptureMode('ocr');
        sendToBackground({ action: "INITIATE_CAPTURE" });
        ui.updateStatus("Select area for OCR...");
    });

    document.getElementById('snip-btn').addEventListener('click', () => {
        app.setCaptureMode('snip');
        sendToBackground({ action: "INITIATE_CAPTURE" });
        ui.updateStatus("Select area to capture...");
    });

    document.getElementById('screenshot-btn').addEventListener('click', () => {
        ui.updateStatus("Capturing screen...");
        sendToBackground({ action: "CAPTURE_SCREENSHOT" });
    });

    // Input Key Handling
    const inputFn = document.getElementById('prompt');
    const sendBtn = document.getElementById('send');

    inputFn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            // Trigger click logic which handles both send and cancel
            sendBtn.click();
        }
    });

    // Send Message Button Logic (Send or Cancel)
    sendBtn.addEventListener('click', () => {
        if (app.isGenerating) {
            app.handleCancel();
        } else {
            app.handleSendMessage();
        }
    });

    // Prevent internal print on Ctrl+P
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
            e.preventDefault();
            inputFn.focus();
        }
    });

    // Message Listener (Background <-> Sandbox)
    window.addEventListener('message', (event) => app.handleIncomingMessage(event));
}