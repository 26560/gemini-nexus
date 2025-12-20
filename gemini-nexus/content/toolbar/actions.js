
// content/toolbar/actions.js

class ToolbarActions {
    constructor(uiController) {
        this.ui = uiController;
        this.lastRequest = null;
    }

    // Helper to detect Chinese language preference
    isChinese() {
        return navigator.language && navigator.language.startsWith('zh');
    }

    // --- Business Logic ---

    async handleImageAnalyze(imgUrl, rect, model = "gemini-2.5-flash") {
        const title = this.isChinese() ? "图片分析" : "Image Analysis";
        const loadingMsg = this.isChinese() ? "正在分析图片内容..." : "Analyzing image content...";
        const inputVal = this.isChinese() ? "分析图片内容" : "Analyze image";
        const prompt = this.isChinese() ? "请详细分析并描述这张图片的内容。" : "Please analyze and describe the content of this image in detail.";

        await this.ui.showAskWindow(rect, loadingMsg, title);
        this.ui.showLoading(loadingMsg);
        this.ui.setInputValue(inputVal);

        const msg = {
            action: "QUICK_ASK_IMAGE",
            url: imgUrl,
            text: prompt,
            model: model
        };
        
        this.lastRequest = msg;
        chrome.runtime.sendMessage(msg);
    }

    async handleQuickAction(actionType, selection, rect, model = "gemini-2.5-flash") {
        const prompt = this.getPrompt(actionType, selection);

        let title = this.isChinese() ? '解释' : 'Explain';
        let inputPlaceholder = this.isChinese() ? '解释选中内容' : 'Explain selected text';
        let loadingMsg = this.isChinese() ? '正在解释...' : 'Explaining...';

        if (actionType === 'translate') {
            title = this.isChinese() ? '翻译' : 'Translate';
            inputPlaceholder = this.isChinese() ? '翻译选中内容' : 'Translate selected text';
            loadingMsg = this.isChinese() ? '正在翻译...' : 'Translating...';
        } else if (actionType === 'summarize') {
            title = this.isChinese() ? '总结' : 'Summarize';
            inputPlaceholder = this.isChinese() ? '总结选中内容' : 'Summarize selected text';
            loadingMsg = this.isChinese() ? '正在总结...' : 'Summarizing...';
        } else if (actionType === 'grammar') {
            title = this.isChinese() ? '语法修正' : 'Fix Grammar';
            inputPlaceholder = this.isChinese() ? '修正语法' : 'Fixing grammar';
            loadingMsg = this.isChinese() ? '正在修正...' : 'Fixing grammar...';
        }

        this.ui.hide();
        await this.ui.showAskWindow(rect, selection, title);
        this.ui.showLoading(loadingMsg);

        this.ui.setInputValue(inputPlaceholder);

        const msg = {
            action: "QUICK_ASK",
            text: prompt,
            model: model
        };

        this.lastRequest = msg;
        chrome.runtime.sendMessage(msg);
    }

    handleSubmitAsk(question, context, sessionId = null, model = "gemini-2.5-flash") {
        this.ui.showLoading();
        
        let prompt = question;
        if (context) {
            prompt = `Context:\n${context}\n\nQuestion: ${question}`;
        }
        
        const msg = {
            action: "QUICK_ASK",
            text: prompt,
            model: model,
            sessionId: sessionId
        };
        
        this.lastRequest = msg;
        chrome.runtime.sendMessage(msg);
    }
    
    handleRetry() {
        if (!this.lastRequest) return;
        
        const loadingMsg = this.isChinese() ? "正在重新生成..." : "Regenerating...";
        this.ui.showLoading(loadingMsg);
        chrome.runtime.sendMessage(this.lastRequest);
    }

    handleCancel() {
        chrome.runtime.sendMessage({ action: "CANCEL_PROMPT" });
    }

    handleContinueChat(sessionId) {
        chrome.runtime.sendMessage({ 
            action: "OPEN_SIDE_PANEL",
            sessionId: sessionId
        });
    }

    // --- Helpers ---

    getPrompt(action, payload) {
        if (this.isChinese()) {
            switch(action) {
                case 'translate':
                    return `将以下内容翻译成地道的中文（若原文非中文）或英文（若原文为中文）。请直接输出翻译后的文本，不要包含任何解释、前言或额外说明：\n\n"${payload}"`;
                case 'explain':
                    return `用通俗易懂的语言简要解释以下内容：\n\n"${payload}"`;
                case 'summarize':
                    return `请尽量简洁地总结以下内容：\n\n"${payload}"`;
                case 'grammar':
                    return `请修正以下文本的语法和拼写错误，保持原意不变。仅输出修正后的文本，不要添加任何解释：\n\n"${payload}"`;
                default:
                    return payload;
            }
        } else {
            // English Prompts
            switch(action) {
                case 'translate':
                    return `Translate the following text into natural English (if source is not English) or to the most likely target language (if source is English). Output ONLY the translation without any preamble or explanation:\n\n"${payload}"`;
                case 'explain':
                    return `Briefly explain the following text in simple language:\n\n"${payload}"`;
                case 'summarize':
                    return `Concise summary of the following text:\n\n"${payload}"`;
                case 'grammar':
                    return `Correct the grammar and spelling of the following text. Output ONLY the corrected text without any explanation:\n\n"${payload}"`;
                default:
                    return payload;
            }
        }
    }
}

// Export global for Content Script usage
window.GeminiToolbarActions = ToolbarActions;