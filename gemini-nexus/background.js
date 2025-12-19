
// background.js
import { GeminiSessionManager } from './background_session.js';
import { ImageHandler } from './background_image.js';
import { setupContextMenus } from './background_menus.js';
import { setupMessageListener } from './background_messages.js';

// Setup Sidepanel
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Initialize Managers
const sessionManager = new GeminiSessionManager();
const imageHandler = new ImageHandler();

// Initialize Modules
setupContextMenus(imageHandler);
setupMessageListener(sessionManager, imageHandler);
