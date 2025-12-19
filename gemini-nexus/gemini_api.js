
// gemini_api.js
import { fetchRequestParams } from './auth.js';
import { uploadImage } from './upload.js';
import { generateUUID } from './utils.js';
import { parseGeminiResponse, parseGeminiLine } from './parser.js';

export async function sendGeminiMessage(prompt, context, model, imageObj, signal, onUpdate) {
    // If no context (first conversation), fetch credentials
    if (!context || !context.atValue) {
        const params = await fetchRequestParams();
        context = {
            atValue: params.atValue,
            blValue: params.blValue,
            // [conversationId, responseId, choiceId]
            contextIds: ['', '', ''] 
        };
    }

    // Handle image upload
    let imageList = [];
    if (imageObj) {
        try {
            // Pass signal to uploadImage
            const imageUrl = await uploadImage(imageObj, signal);
            // Construct Gemini image format: [[[url, 1], filename]]
            imageList = [[[imageUrl, 1], imageObj.name]];
        } catch (e) {
            console.error("Image upload failed:", e);
            throw e;
        }
    }

    const conversationId = context.contextIds[0] || "";
    const responseId = context.contextIds[1] || "";
    const choiceId = context.contextIds[2] || "";

    // --- Construct Payload ---
    // Array total length 95
    const reqData = new Array(95).fill(null);

    // [0] User Input (text + image)
    reqData[0] = [prompt, 0, null, imageList.length > 0 ? imageList : null, null, null, 0];
    
    // [1] Language
    reqData[1] = ["zh-CN"];
    
    // [2] Context IDs
    reqData[2] = [conversationId, responseId, choiceId, null, null, [], null, null, null, ""];
    
    // [3] Model/Routing params
    reqData[3] = "!CAulC1PNAAZT9fabc_VCOh8qxrLC7BA7ADQBEArZ1H9y4NapwcUiZ2CnLfwfqYZzIXcNnMn9P9pENN_t-nTN0MIdYKUcXEwQ5ZCj2Mk6AgAAAKBSAAAADmgBB34AQS2KvoLeZhHFgongSUwPIjrUQ6O0UuRjFUgVsTEmaI0VdOWH5VIkPV3OT38Y65swGd6IgECeOHTY22UCHGCn1XeDmQM3EqtH2LDYWhAbIRh6Y4QroOiTx7JSzd5uD4ClXjlZtdBAXd9LEHqvkatmyDjb9TI68jJ_d_fvR9Di3ajmV64cEamPfGKHxMDs7r7W8HDviVWIlmn5wcUKpy5Xht606IdSCifXdpieQtKOXX_124aiPrI9PAbqphMfNk75IsDfuZ23eJDAf8npSe7JwWs7YoRyG4rhs_ZnksqghIgVwHJuJS2Qx6S-qm5H3hLDmNnqauZV00eoq8MMZyST2jMwBcbF500JhK52jYjf1ew23EU36F3_8Kh6OnhxsEzv36La-rITXUgq-FE9WFu2wHNsdQu3OrIpeL3vQfKyDd5e84qAgLXsOYQMMSZRoec5jOt3O8ZnCXswmtC9lPYUDpjHM9-lrs56B-RCRHhjSKlbAeEr2Yr6Q97Oko-0uIpRTSdwML8HupgMOLmxEPD3k0EWFNRT5_nTXg7jVWB63eA2Xn4eNNIn-e0lV4l3vBqrz7DnpUhqGPZM9WA9nFUR0eaVzuGxs4OD7pN9UETPycLNYb8734ksD-8YFMLQvn3uyJ4-EloAzHO7jsxr4krT0uv1Ct_78W6bN_k5pHNUhyV8qK-IqpHcIJZcWReov0PN5zkRIUsc-RN3JtW8qvsT0HTGN9BL-X_04EHbCaewa2JX_oAgNzeDpMD2cQyLj-geUPp_MKdRYtBD_KpgeRLGZYiPcp6p6BA7IlB4GAzPDRQUP64Y5IzAjlDHXF1aC4X90OrAGNBsruZwBPiHL20Q8cTsZ9otaPlCWIZu2aRO7On4OLYOA95Ra8G6SdSR6d7QHhjf7O45TmE1ps7Tgrxu3dWHukYsCEEoqcY7DXYvo6k4wzbhtue2nfFXwe_Qbu_eNtkLHGrBwj7z45kOdP5Zgn-_7etVR_cIZLBqMEIjHgIle5QAPIXomu0NAqzyzT0wZPb4lNHpPmLONTjbDmEgxoUtP4jgQFcxUmlhmmWlo6r3St87T0qfMJU3dFbueQ8Gz3P9c2ERsNWKdwhqzxhESuv5Gbjj6bed0wQfPD2eTRoohr6R_kVIgEUgIoOqD5CRE8gDq6wFlGmfRQcATgmLN6oB9BlLfs-Vciqehg";
    
    // [4] Constant identifier
    reqData[4] = "2f47f911b4ca432724a308d2992110f0";

    // Standard feature values
    reqData[6] = [0];
    reqData[7] = 1;
    reqData[10] = 1;
    reqData[11] = 0;
    reqData[17] = [[0]];
    reqData[18] = 0;
    reqData[27] = 1;
    
    // --- 3 Flash specific features ---
    reqData[30] = [4];
    reqData[41] = [2]; 
    // ----------------------

    reqData[53] = 0;
    
    // [59] UUID
    reqData[59] = generateUUID(); 

    reqData[61] = [];
    
    // [66] Timestamp [seconds, microseconds]
    const now = Date.now();
    reqData[66] = [Math.floor(now / 1000), 287000000]; 
    
    // [94] End
    reqData[94] = []; 

    const reqPayload = [
        null,
        JSON.stringify(reqData)
    ];

    const queryParams = new URLSearchParams({
        bl: context.blValue || 'boq_assistant-bard-web-server_20230713.13_p0',
        _reqid: Math.floor(Math.random() * 900000) + 100000,
        rt: 'c'
    });

    // Send Request
    const response = await fetch(
        `https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate?${queryParams.toString()}`, 
        {
            method: 'POST',
            signal: signal, 
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            },
            body: new URLSearchParams({
                at: context.atValue,
                'f.req': JSON.stringify(reqPayload)
            })
        }
    );

    if (!response.ok) {
        throw new Error(`Network Error: ${response.status}`);
    }

    // --- Streaming Response Handling ---
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let finalResult = null;

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            // Process complete lines
            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, newlineIndex);
                buffer = buffer.slice(newlineIndex + 1);

                const parsed = parseGeminiLine(line);
                if (parsed) {
                    finalResult = parsed; // Keep track of latest full state
                    if (onUpdate) {
                        onUpdate(parsed.text);
                    }
                }
            }
        }
    } catch (e) {
        if (e.name === 'AbortError') throw e;
        console.error("Stream reading error:", e);
    }

    // Process any remaining buffer
    if (buffer.length > 0) {
        const parsed = parseGeminiLine(buffer);
        if (parsed) finalResult = parsed;
    }

    if (!finalResult) {
         throw new Error("No valid response found in stream");
    }

    // Update Context from final result
    context.contextIds = finalResult.ids;

    return {
        text: finalResult.text,
        newContext: context
    };
}