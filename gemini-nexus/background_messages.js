
// background_messages.js
import { saveToHistory } from './background_history.js';

/**
 * Sets up the global runtime message listener.
 * @param {GeminiSessionManager} sessionManager 
 * @param {ImageHandler} imageHandler 
 */
export function setupMessageListener(sessionManager, imageHandler) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
        // --- Session / Prompt Logic ---

        if (request.action === "SEND_PROMPT") {
            (async () => {
                const onUpdate = (partialText) => {
                    chrome.runtime.sendMessage({
                        action: "GEMINI_STREAM_UPDATE",
                        text: partialText
                    });
                };

                const result = await sessionManager.handleSendPrompt(request, onUpdate);
                if (result) {
                    chrome.runtime.sendMessage(result);
                }
            })();
            return true; // Keep channel open
        }

        // Handle Quick Ask from Content Script (returns to sender via streaming)
        if (request.action === "QUICK_ASK") {
            (async () => {
                const tabId = sender.tab ? sender.tab.id : null;
                
                // Ensure Quick Ask starts with a fresh context so it saves as a clean new history item
                await sessionManager.resetContext();

                const onUpdate = (partialText) => {
                    if (tabId) {
                        chrome.tabs.sendMessage(tabId, {
                            action: "GEMINI_STREAM_UPDATE",
                            text: partialText
                        });
                    }
                };

                const result = await sessionManager.handleSendPrompt(request, onUpdate);
                
                let savedSession = null;
                // Save to history on success
                if (result && result.status === 'success') {
                    savedSession = await saveToHistory(request.text, result, null);
                }

                // Send final "Done" or "Error" message
                if (tabId) {
                    chrome.tabs.sendMessage(tabId, {
                        action: "GEMINI_STREAM_DONE",
                        result: result,
                        sessionId: savedSession ? savedSession.id : null
                    });
                }
            })();
            return true;
        }

        // Handle Quick Ask Image (Fetch + Prompt + Streaming)
        if (request.action === "QUICK_ASK_IMAGE") {
            (async () => {
                const tabId = sender.tab ? sender.tab.id : null;

                // 1. Fetch the image content (Background avoids CORS issues better than content script)
                const imgRes = await imageHandler.fetchImage(request.url);
                
                if (imgRes.error) {
                    if (tabId) {
                        chrome.tabs.sendMessage(tabId, {
                            action: "GEMINI_STREAM_DONE",
                            result: { status: "error", text: "Failed to load image: " + imgRes.error }
                        });
                    }
                    return;
                }

                // 2. Construct Prompt Request
                const promptRequest = {
                    text: request.text,
                    model: request.model,
                    image: imgRes.base64,
                    imageType: imgRes.type,
                    imageName: imgRes.name
                };

                // Ensure Quick Ask starts with a fresh context
                await sessionManager.resetContext();

                // 3. Send to Gemini
                const onUpdate = (partialText) => {
                    if (tabId) {
                        chrome.tabs.sendMessage(tabId, {
                            action: "GEMINI_STREAM_UPDATE",
                            text: partialText
                        });
                    }
                };

                const result = await sessionManager.handleSendPrompt(promptRequest, onUpdate);
                
                let savedSession = null;
                // Save to history on success
                if (result && result.status === 'success') {
                    savedSession = await saveToHistory(request.text, result, { base64: imgRes.base64 });
                }

                if (tabId) {
                    chrome.tabs.sendMessage(tabId, {
                        action: "GEMINI_STREAM_DONE",
                        result: result,
                        sessionId: savedSession ? savedSession.id : null
                    });
                }
            })();
            return true;
        }

        if (request.action === "CANCEL_PROMPT") {
            const cancelled = sessionManager.cancelCurrentRequest();
            sendResponse({ status: cancelled ? "cancelled" : "no_active_request" });
            return;
        }

        if (request.action === "SET_CONTEXT") {
            sessionManager.setContext(request.context, request.model)
                .then(() => sendResponse({status: "context_updated"}));
            return true;
        }

        if (request.action === "RESET_CONTEXT") {
            sessionManager.resetContext()
                .then(() => sendResponse({status: "reset"}));
            return true;
        }


        // --- Image / Capture Logic ---

        if (request.action === "FETCH_IMAGE") {
            (async () => {
                const result = await imageHandler.fetchImage(request.url);
                chrome.runtime.sendMessage(result);
            })();
            return true;
        }

        if (request.action === "CAPTURE_SCREENSHOT") {
            (async () => {
                const result = await imageHandler.captureScreenshot();
                chrome.runtime.sendMessage(result);
            })();
            return true;
        }

        // --- Interaction / OCR Flow ---

        if (request.action === "OPEN_SIDE_PANEL") {
            if (sender.tab) {
                // Fix: Call open() immediately to preserve user gesture context. 
                const openPromise = chrome.sidePanel.open({ tabId: sender.tab.id, windowId: sender.tab.windowId })
                    .catch(err => console.error("Could not open side panel:", err));

                (async () => {
                    // 1. Store pending session ID for fresh opens (Sidepanel will consume this on load)
                    if (request.sessionId) {
                        await chrome.storage.local.set({ pendingSessionId: request.sessionId });
                        
                        // Cleanup safeguard: Remove after 5 seconds if not consumed
                        setTimeout(() => chrome.storage.local.remove('pendingSessionId'), 5000);
                    }

                    // Ensure open attempted
                    try { await openPromise; } catch (e) {}

                    // 2. Send immediate message for already-open panels (Slight delay to ensure listening)
                    if (request.sessionId) {
                        setTimeout(() => {
                            chrome.runtime.sendMessage({
                                action: "SWITCH_SESSION",
                                sessionId: request.sessionId
                            });
                        }, 500);
                    }
                })();
            }
        }

        // Step 1: UI requests selection
        if (request.action === "INITIATE_CAPTURE") {
            (async () => {
                const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
                if (tab) {
                    chrome.tabs.sendMessage(tab.id, { action: "START_SELECTION" });
                }
            })();
        }

        // Step 2: Content script finishes selection
        if (request.action === "AREA_SELECTED") {
            (async () => {
                const result = await imageHandler.captureArea(request.area);
                if (result) {
                    chrome.runtime.sendMessage(result);
                }
            })();
        }
    });
}
