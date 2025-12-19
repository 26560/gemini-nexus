
// content_toolbar_markdown.js
(function() {
    class MarkdownRenderer {
        static render(text) {
            if (!text) return '';

            // 1. Escape HTML
            let safeText = text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");

            // 2. Extract Code Blocks (Protect them from other parsing)
            const codeBlocks = [];
            safeText = safeText.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, content) => {
                codeBlocks.push({ lang: lang || '', content });
                return `\u0000CODEBLOCK${codeBlocks.length - 1}\u0000`; 
            });

            // 3. Extract Inline Code
            const inlineCode = [];
            safeText = safeText.replace(/`([^`]+)`/g, (match, content) => {
                inlineCode.push(content);
                return `\u0000INLINECODE${inlineCode.length - 1}\u0000`;
            });

            // 4. Line-by-Line Block Processing
            const lines = safeText.split('\n');
            let output = [];
            
            let state = {
                inList: null, // 'ul' or 'ol'
                inTable: false,
                inBlockquote: false
            };

            // Helpers to close open blocks
            const flushList = () => {
                if (state.inList) {
                    output.push(`</${state.inList}>`);
                    state.inList = null;
                }
            };

            const flushTable = () => {
                if (state.inTable) {
                    output.push('</tbody></table>');
                    state.inTable = false;
                }
            };
            
            const flushBlockquote = () => {
                if (state.inBlockquote) {
                    output.push('</blockquote>');
                    state.inBlockquote = false;
                }
            };

            const flushAll = () => {
                flushList();
                flushTable();
                flushBlockquote();
            };

            for (let i = 0; i < lines.length; i++) {
                let line = lines[i];
                let trimLine = line.trim();

                // Empty Line -> Flush blocks (End of lists/tables/quotes)
                if (trimLine === '') {
                    flushAll();
                    continue;
                }

                // Horizontal Rule
                if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimLine)) {
                    flushAll();
                    output.push('<hr>');
                    continue;
                }

                // Headers (e.g., ## Title)
                let headerMatch = trimLine.match(/^(#{1,6})\s+(.*)/);
                if (headerMatch) {
                    flushAll();
                    const level = headerMatch[1].length;
                    output.push(`<h${level}>${this.processInline(headerMatch[2])}</h${level}>`);
                    continue;
                }

                // Lists
                // Unordered: - item or * item
                let ulMatch = line.match(/^(\s*)([-*+])\s+(.*)/);
                // Ordered: 1. item
                let olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)/);

                if (ulMatch || olMatch) {
                    flushTable();
                    // Note: Not strictly flushing blockquote to allow lists inside quotes would require stack logic, 
                    // but for simplicity we flush to keep structure flat and safe.
                    if (!state.inBlockquote) flushBlockquote(); 

                    const type = ulMatch ? 'ul' : 'ol';
                    const content = ulMatch ? ulMatch[3] : olMatch[3];

                    if (state.inList !== type) {
                        flushList();
                        state.inList = type;
                        output.push(`<${type}>`);
                    }
                    
                    output.push(`<li>${this.processInline(content)}</li>`);
                    continue;
                } else {
                    flushList();
                }

                // Blockquotes (> text)
                if (trimLine.startsWith('>')) {
                    flushTable();
                    flushList();
                    
                    if (!state.inBlockquote) {
                        state.inBlockquote = true;
                        output.push('<blockquote>');
                    }
                    let content = trimLine.replace(/^>\s?/, '');
                    output.push(`${this.processInline(content)}<br>`);
                    continue;
                } else {
                    flushBlockquote();
                }

                // Tables
                // Simple detection: Starts and ends with |
                if (trimLine.startsWith('|') && trimLine.endsWith('|')) {
                    const cols = trimLine.split('|').slice(1, -1).map(c => c.trim());
                    
                    if (!state.inTable) {
                        // Start Table
                        state.inTable = true;
                        output.push('<table><thead><tr>');
                        cols.forEach(c => output.push(`<th>${this.processInline(c)}</th>`));
                        output.push('</tr></thead><tbody>');
                        
                        // Check if next line is separator |---| and skip it
                        if (lines[i+1]) {
                            const nextTrim = lines[i+1].trim();
                            if (nextTrim.startsWith('|') && nextTrim.includes('-')) {
                                i++; 
                            }
                        }
                    } else {
                        // Table Body
                        output.push('<tr>');
                        cols.forEach(c => output.push(`<td>${this.processInline(c)}</td>`));
                        output.push('</tr>');
                    }
                    continue;
                } else {
                    flushTable();
                }

                // Regular Paragraph or Code Block Placeholder
                if (trimLine.startsWith('\u0000CODEBLOCK')) {
                    // Code block placeholder takes the whole line (usually)
                    output.push(trimLine); 
                } else {
                    output.push(`<p>${this.processInline(trimLine)}</p>`);
                }
            }

            flushAll();

            let html = output.join('\n');

            // 5. Restore Inline Code
            html = html.replace(/\u0000INLINECODE(\d+)\u0000/g, (match, id) => {
                return `<code>${inlineCode[id]}</code>`;
            });

            // 6. Restore Code Blocks
            html = html.replace(/\u0000CODEBLOCK(\d+)\u0000/g, (match, id) => {
                const block = codeBlocks[id];
                const langLabel = block.lang ? `<div class="code-lang">${block.lang}</div>` : '';
                return `<pre>${langLabel}<code>${block.content}</code></pre>`;
            });

            return html;
        }

        static processInline(text) {
            if (!text) return '';

            // Images: ![alt](url)
            text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

            // Links: [text](url)
            text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

            // Bold: **text**
            text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

            // Italic: *text*
            text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
            
            // Strikethrough: ~~text~~
            text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>');

            return text;
        }
    }

    window.GeminiMarkdownRenderer = MarkdownRenderer;
})();
