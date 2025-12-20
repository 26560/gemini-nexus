
// sandbox/render/content.js
import { MathHandler } from './math_utils.js';

// Helper: Render Markdown/Math/Text into an element
export function renderContent(contentDiv, text, role) {
    // Render Markdown and Math for AI responses
    // Check if marked is loaded (it might be lazy loading)
    if (role === 'ai' && typeof marked !== 'undefined') {
        
        const mathHandler = new MathHandler();
        
        // --- Math Protection ---
        let processedText = mathHandler.protect(text);

        // --- Markdown Parsing ---
        let html = marked.parse(processedText);
        
        // --- Restore Math ---
        html = mathHandler.restore(html);

        contentDiv.innerHTML = html;
        
        // Render Math (KaTeX)
        if (typeof renderMathInElement !== 'undefined') {
            renderMathInElement(contentDiv, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\(', right: '\\)', display: false},
                    {left: '\\[', right: '\\]', display: true}
                ],
                throwOnError: false
            });
        }
    } else {
        // User message OR fallback if marked not loaded yet
        contentDiv.innerText = text;
    }
}
