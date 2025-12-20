
// background/menus.js

/**
 * Initializes Context Menus and attaches the click listener.
 * @param {ImageHandler} imageHandler - Instance of the ImageHandler.
 */
export function setupContextMenus(imageHandler) {
    
    // Create Context Menus with Localization check
    chrome.runtime.onInstalled.addListener(() => {
        const isZh = chrome.i18n.getUILanguage().startsWith('zh');
        
        const titles = {
            main: isZh ? "Gemini Nexus" : "Gemini Nexus",
            pageChat: isZh ? "与当前网页对话" : "Chat with Page",
            ocr: isZh ? "OCR (文字提取)" : "OCR (Extract Text)",
            snip: isZh ? "区域截图 (Snip)" : "Snip (Capture Area)",
            screenshot: isZh ? "全屏截图" : "Full Screenshot"
        };

        chrome.contextMenus.create({
            id: "gemini-nexus-parent",
            title: titles.main,
            contexts: ["all"]
        });

        chrome.contextMenus.create({
            id: "menu-page-chat",
            parentId: "gemini-nexus-parent",
            title: titles.pageChat,
            contexts: ["all"]
        });

        chrome.contextMenus.create({
            id: "menu-ocr",
            parentId: "gemini-nexus-parent",
            title: titles.ocr,
            contexts: ["all"]
        });

        chrome.contextMenus.create({
            id: "menu-snip",
            parentId: "gemini-nexus-parent",
            title: titles.snip,
            contexts: ["all"]
        });

        chrome.contextMenus.create({
            id: "menu-screenshot",
            parentId: "gemini-nexus-parent",
            title: titles.screenshot,
            contexts: ["all"]
        });
    });
    
    // Also try to recreate on Startup to catch language changes if browser restarts
    chrome.runtime.onStartup.addListener(() => {
        // We can't check if menus exist easily without callback hell, but create wipes previous ones usually on reload
        // Or we can rely on chrome handling this. 
        // Best practice is usually onInstalled, but language changes might need reinstall.
        // For now, onInstalled is standard.
    });

    // Handle Context Menu Clicks
    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
        if (!tab) return;

        if (info.menuItemId === "menu-page-chat") {
            // 1. Open Side Panel
            await chrome.sidePanel.open({ tabId: tab.id, windowId: tab.windowId });
            
            // 2. Activate Page Context Mode
            setTimeout(() => {
                chrome.runtime.sendMessage({ 
                    action: "TOGGLE_PAGE_CONTEXT", 
                    enable: true 
                });
            }, 500);
        }

        if (info.menuItemId === "menu-ocr" || info.menuItemId === "menu-snip") {
            const mode = info.menuItemId === "menu-ocr" ? "ocr" : "snip";
            
            // 1. Start selection overlay in the content script
            chrome.tabs.sendMessage(tab.id, { action: "START_SELECTION" });
            
            // 2. Open Side Panel
            await chrome.sidePanel.open({ tabId: tab.id, windowId: tab.windowId });
            
            // 3. Inform the Side Panel of the capture mode
            setTimeout(() => {
                chrome.runtime.sendMessage({ 
                    action: "SET_SIDEBAR_CAPTURE_MODE", 
                    mode: mode 
                });
            }, 300);
        }

        if (info.menuItemId === "menu-screenshot") {
            // 1. Open Side Panel
            await chrome.sidePanel.open({ tabId: tab.id, windowId: tab.windowId });
            
            // 2. Capture and send to side panel
            const result = await imageHandler.captureScreenshot();
            chrome.runtime.sendMessage(result);
        }
    });
}
