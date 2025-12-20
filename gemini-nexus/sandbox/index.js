
// sandbox/index.js
import { ImageManager } from './core/image_manager.js';
import { SessionManager } from './core/session_manager.js';
import { UIController } from './ui/controller.js';
import { AppController } from './app_controller.js';
import { sendToBackground } from '../lib/messaging.js';
import { configureMarkdown } from './render/config.js';
import { applyTranslations } from './core/i18n.js';
import { renderLayout } from './ui/layout.js';

// --- Initialization ---

// 0. Render App Layout (Before DOM query)
renderLayout();

// 1. Apply Initial Translations
applyTranslations();

// 2. Critical Optimization: Signal Ready Immediately
// Tell parent (sidepanel/index.js) to hide skeleton loader and send data
window.parent.postMessage({ action: 'UI_READY' }, '*');

// 3. Lazy Load Heavy Dependencies (Background)
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function loadCSS(href) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
}

// Load external libs after UI is interactive
setTimeout(async () => {
    try {
        // Load Marked (Priority for chat rendering)
        await loadScript('https://cdn.jsdelivr.net/npm/marked/marked.min.js');
        // Re-run config now that marked is loaded
        configureMarkdown();

        // Load others in parallel
        loadCSS('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css');
        loadCSS('https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/atom-one-dark.min.css');

        await Promise.all([
            loadScript('https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js'),
            loadScript('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js'),
            loadScript('https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.basic.min.js')
        ]);
        
        // Auto-render ext for Katex
        await loadScript('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js');
        
    } catch (e) {
        console.warn("Deferred loading failed", e);
    }
}, 50);


// 4. Listen for Language Changes
document.addEventListener('gemini-language-changed', () => {
    applyTranslations();
});

let app;

// Init Managers immediately (Script is type="module", so DOM is ready)
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
    modelSelect: document.getElementById('model-select')
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

// Initialize Controller
app = new AppController(sessionManager, ui, imageManager);

// Configure Markdown (Initial pass, might be skipped if marked not loaded yet)
configureMarkdown();

// Bind Events
bindAppEvents(app, ui);

// --- Event Binding ---

function bindAppEvents(app, ui) {
    // New Chat Buttons
    document.getElementById('new-chat-header-btn').addEventListener('click', () => app.handleNewChat());

    // Tools
    document.getElementById('quote-btn').addEventListener('click', () => {
        sendToBackground({ action: "GET_ACTIVE_SELECTION" });
    });

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

    // Page Context Toggle
    const contextBtn = document.getElementById('page-context-btn');
    if (contextBtn) {
        contextBtn.addEventListener('click', () => app.togglePageContext());
    }

    // Model Selector
    const modelSelect = document.getElementById('model-select');
    
    // Auto-resize Logic
    const resizeModelSelect = () => {
        if (!modelSelect) return;
        const tempSpan = document.createElement('span');
        Object.assign(tempSpan.style, {
            visibility: 'hidden',
            position: 'absolute',
            fontSize: '13px',
            fontWeight: '500',
            fontFamily: window.getComputedStyle(modelSelect).fontFamily,
            whiteSpace: 'nowrap'
        });
        tempSpan.textContent = modelSelect.options[modelSelect.selectedIndex].text;
        document.body.appendChild(tempSpan);
        const width = tempSpan.getBoundingClientRect().width;
        document.body.removeChild(tempSpan);
        // Add padding (Left 12px + Right 12px + Buffer 2px = 26px)
        modelSelect.style.width = `${width + 26}px`;
    };

    if (modelSelect) {
        modelSelect.addEventListener('change', (e) => {
             app.handleModelChange(e.target.value);
             resizeModelSelect();
        });
        // Initial resize
        resizeModelSelect();
    }

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
    window.addEventListener('message', (event) => {
        const { action, payload } = event.data;
        
        if (action === 'RESTORE_SHORTCUTS') {
            ui.updateShortcuts(payload);
            return;
        }

        if (action === 'RESTORE_THEME') {
            ui.updateTheme(payload);
            return;
        }
        
        if (action === 'RESTORE_LANGUAGE') {
            ui.updateLanguage(payload);
            return;
        }

        if (action === 'RESTORE_MODEL') {
            if (ui.modelSelect) {
                ui.modelSelect.value = payload;
                resizeModelSelect();
            }
            return;
        }
        
        app.handleIncomingMessage(event);
    });
}
