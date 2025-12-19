// utils.js

// Extract authentication token from HTML
export function extractFromHTML(variableName, html) {
    const regex = new RegExp(`"${variableName}":"([^"]+)"`);
    const match = regex.exec(html);
    return match?.[1];
}

// Generate a random UUID
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    }).toUpperCase();
}

// Convert Data URL to Blob
export async function dataUrlToBlob(dataUrl) {
    const res = await fetch(dataUrl);
    return await res.blob();
}