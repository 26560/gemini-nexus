
// upload.js
import { dataUrlToBlob } from './utils.js';

// Upload image to Google's content-push service
export async function uploadImage(imageObj, signal) {
    console.log("Uploading image...", imageObj.name);
    
    // 1. Prepare upload
    const blob = await dataUrlToBlob(imageObj.base64);
    
    const initHeaders = {
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'push-id': 'feeds/mcudyrk2a4khkz', // Fixed value
        'x-goog-upload-header-content-length': blob.size.toString(),
        'x-goog-upload-protocol': 'resumable',
        'x-tenant-id': 'bard-storage',
    };

    const initResp = await fetch('https://content-push.googleapis.com/upload/', {
        method: 'POST',
        signal: signal, // Add signal
        headers: {
            ...initHeaders,
            'x-goog-upload-command': 'start',
        },
        // Google upload protocol requires filename in body key
        body: new URLSearchParams({ [`File name: ${imageObj.name}`]: '' }),
    });

    const uploadUrl = initResp.headers.get('x-goog-upload-url');
    if (!uploadUrl) {
        throw new Error("Image upload initialization failed");
    }

    // 2. Execute upload
    const uploadResp = await fetch(uploadUrl, {
        method: 'POST',
        signal: signal, // Add signal
        headers: {
            ...initHeaders,
            'x-goog-upload-command': 'upload, finalize',
            'x-goog-upload-offset': '0',
        },
        body: blob
    });

    if (!uploadResp.ok) {
        throw new Error("Image upload failed");
    }

    const responseText = await uploadResp.text();
    // Returns image reference URL (usually starts with https://lh3.googleusercontent.com/)
    console.log("Image upload success:", responseText);
    return responseText;
}
