
// messaging.js

export function sendToBackground(payload) {
    window.parent.postMessage({
        action: 'FORWARD_TO_BACKGROUND',
        payload: payload
    }, '*');
}

export function saveSessionsToStorage(sessions) {
    window.parent.postMessage({
        action: 'SAVE_SESSIONS',
        payload: sessions
    }, '*');
}

export function requestSessionsFromStorage() {
    window.parent.postMessage({ action: 'GET_SESSIONS' }, '*');
}
