// sandbox/ui/layout.js
import { SidebarTemplate } from './templates/sidebar.js';
import { HeaderTemplate } from './templates/header.js';
import { ChatTemplate } from './templates/chat.js';
import { FooterTemplate } from './templates/footer.js';
import { ViewerTemplate } from './templates/viewer.js';
import { SettingsTemplate } from './templates/settings.js';

export function renderLayout() {
    const LayoutTemplate = SidebarTemplate + HeaderTemplate + ChatTemplate + FooterTemplate + ViewerTemplate + SettingsTemplate;
    const app = document.getElementById('app');
    if (app) app.innerHTML = LayoutTemplate;
}