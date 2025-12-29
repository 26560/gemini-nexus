
// sandbox/ui/settings/sections/connection.js

export class ConnectionSection {
    constructor() {
        this.elements = {};
        this.queryElements();
        this.bindEvents();
    }

    queryElements() {
        const get = (id) => document.getElementById(id);
        this.elements = {
            providerSelect: get('provider-select'),
            apiKeyContainer: get('api-key-container'),
            
            // Official Fields
            officialFields: get('official-fields'),
            apiKeyInput: get('api-key-input'),
            thinkingLevelSelect: get('thinking-level-select'),
            
            // OpenAI Fields
            openaiFields: get('openai-fields'),
            openaiBaseUrl: get('openai-base-url'),
            openaiApiKey: get('openai-api-key'),
            openaiModel: get('openai-model'),

            // MCP Fields
            mcpEnabled: get('mcp-enabled'),
            mcpFields: get('mcp-fields'),
            mcpTransport: get('mcp-transport'),
            mcpServerUrl: get('mcp-server-url'),
        };
    }

    bindEvents() {
        const { providerSelect } = this.elements;
        if (providerSelect) {
            providerSelect.addEventListener('change', (e) => {
                this.updateVisibility(e.target.value);
            });
        }

        const { mcpEnabled } = this.elements;
        if (mcpEnabled) {
            mcpEnabled.addEventListener('change', (e) => {
                this.updateMcpVisibility(e.target.checked === true);
            });
        }
    }

    setData(data) {
        const { 
            providerSelect, apiKeyInput, thinkingLevelSelect, 
            openaiBaseUrl, openaiApiKey, openaiModel,
            mcpEnabled, mcpTransport, mcpServerUrl
        } = this.elements;

        // Provider
        if (providerSelect) {
            providerSelect.value = data.provider || 'web';
            this.updateVisibility(data.provider || 'web');
        }
        
        // Official
        if (apiKeyInput) apiKeyInput.value = data.apiKey || "";
        if (thinkingLevelSelect) thinkingLevelSelect.value = data.thinkingLevel || "low";
        
        // OpenAI
        if (openaiBaseUrl) openaiBaseUrl.value = data.openaiBaseUrl || "";
        if (openaiApiKey) openaiApiKey.value = data.openaiApiKey || "";
        if (openaiModel) openaiModel.value = data.openaiModel || "";

        // MCP
        if (mcpEnabled) {
            mcpEnabled.checked = data.mcpEnabled === true;
            this.updateMcpVisibility(mcpEnabled.checked);
        }
        if (mcpTransport) mcpTransport.value = data.mcpTransport || "sse";
        if (mcpServerUrl) mcpServerUrl.value = data.mcpServerUrl || "http://localhost:3006/sse";
    }

    getData() {
        const { 
            providerSelect, apiKeyInput, thinkingLevelSelect, 
            openaiBaseUrl, openaiApiKey, openaiModel,
            mcpEnabled, mcpTransport, mcpServerUrl
        } = this.elements;

        return {
            provider: providerSelect ? providerSelect.value : 'web',
            // Official
            apiKey: apiKeyInput ? apiKeyInput.value.trim() : "",
            thinkingLevel: thinkingLevelSelect ? thinkingLevelSelect.value : "low",
            // OpenAI
            openaiBaseUrl: openaiBaseUrl ? openaiBaseUrl.value.trim() : "",
            openaiApiKey: openaiApiKey ? openaiApiKey.value.trim() : "",
            openaiModel: openaiModel ? openaiModel.value.trim() : "",

            // MCP
            mcpEnabled: mcpEnabled ? mcpEnabled.checked === true : false,
            mcpTransport: mcpTransport ? mcpTransport.value : "sse",
            mcpServerUrl: mcpServerUrl ? mcpServerUrl.value.trim() : ""
        };
    }

    updateVisibility(provider) {
        const { apiKeyContainer, officialFields, openaiFields } = this.elements;
        if (!apiKeyContainer) return;

        if (provider === 'web') {
            apiKeyContainer.style.display = 'none';
        } else {
            apiKeyContainer.style.display = 'flex';
            if (provider === 'official') {
                if (officialFields) officialFields.style.display = 'flex';
                if (openaiFields) openaiFields.style.display = 'none';
            } else if (provider === 'openai') {
                if (officialFields) officialFields.style.display = 'none';
                if (openaiFields) openaiFields.style.display = 'flex';
            }
        }
    }

    updateMcpVisibility(enabled) {
        const { mcpFields } = this.elements;
        if (!mcpFields) return;
        mcpFields.style.display = enabled ? 'flex' : 'none';
    }
}
