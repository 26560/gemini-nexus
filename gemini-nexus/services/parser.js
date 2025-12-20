
// services/parser.js

export function parseGeminiLine(line) {
    try {
        // Strip anti-hijacking prefix if present
        const cleanLine = line.replace(/^\)\]\}'/, '').trim();
        if (!cleanLine) return null;

        const rawData = JSON.parse(cleanLine);
        
        // The response should be an array (envelope)
        const rootArray = Array.isArray(rawData) ? rawData : null;
        if (!rootArray) return null;

        // Helper to validate and extract from a potential payload item
        // Expected structure: [id, index, json_string, ...]
        const extractPayload = (item) => {
             if (!Array.isArray(item) || item.length < 3) return null;
             
             // The payload is typically a JSON string at index 2
             const payloadStr = item[2];
             if (typeof payloadStr !== 'string') return null;
             
             try {
                 const payload = JSON.parse(payloadStr);
                 
                 // Payload structure typically: 
                 // [ [conv_id, resp_id], ..., null, null, [ [candidates] ] ]
                 // We look for payload[4][0] -> first candidate
                 if (!Array.isArray(payload) || payload.length < 5) return null;
                 
                 const candidates = payload[4];
                 if (!Array.isArray(candidates) || !candidates[0]) return null;
                 
                 // Candidate structure: [choiceId, [text_node], ...]
                 const firstCandidate = candidates[0];
                 if (!Array.isArray(firstCandidate) || firstCandidate.length < 2) return null;

                 const textNode = firstCandidate[1];
                 if (!Array.isArray(textNode) || typeof textNode[0] !== 'string') return null;

                 return {
                     text: textNode[0],
                     conversationId: payload[1]?.[0],
                     responseId: payload[1]?.[1],
                     choiceId: firstCandidate[0]
                 };
             } catch(e) { 
                 return null; 
             }
        };

        // Iterate through all items in the envelope to find the one containing the chat payload
        // This handles cases where the 'wrb.fr' ID changes, moves, or the item index shifts
        for (const item of rootArray) {
            const result = extractPayload(item);
            if (result) {
                return {
                    text: result.text,
                    ids: [result.conversationId, result.responseId, result.choiceId]
                };
            }
        }

    } catch (e) {
        // Line parsing failed (not JSON or unexpected format)
    }
    return null;
}
