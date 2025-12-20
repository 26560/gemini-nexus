// services/auth.js
import { extractFromHTML } from '../lib/utils.js';

// Get 'at' (SNlM0e), 'bl' (cfb2h), and user index values
export async function fetchRequestParams() {
    console.log("Fetching Gemini credentials...");
    const resp = await fetch('https://gemini.google.com/', {
        method: 'GET'
    });
    const html = await resp.text();

    const atValue = extractFromHTML('SNlM0e', html);
    const blValue = extractFromHTML('cfb2h', html);
    
    // Try to find the user index (authuser) to support multiple accounts
    // Usually found in the URL or implied, but scraping data-index is safer if available
    // Default to 0 if not found.
    let authUserIndex = '0';
    const authMatch = html.match(/data-index="(\d+)"/);
    if (authMatch) {
        authUserIndex = authMatch[1];
    }

    if (!atValue) {
        throw new Error("Not logged in. Please log in to gemini.google.com in your browser.");
    }

    return { atValue, blValue, authUserIndex };
}