
// services/keep_alive.js

const ALARM_NAME = 'gemini_cookie_rotate';
// 9 minutes matches the python implementation (540s)
const INTERVAL_MINUTES = 9; 

export function initKeepAlive() {
    // Check if alarm exists to prevent duplicate creation on reload
    chrome.alarms.get(ALARM_NAME, (alarm) => {
        if (!alarm) {
            chrome.alarms.create(ALARM_NAME, {
                periodInMinutes: INTERVAL_MINUTES
            });
        }
    });

    // Add listener only once
    if (!chrome.alarms.onAlarm.hasListener(onAlarmListener)) {
        chrome.alarms.onAlarm.addListener(onAlarmListener);
    }

    // Perform an initial check on load
    performRotation();
}

function onAlarmListener(alarm) {
    if (alarm.name === ALARM_NAME) {
        performRotation();
    }
}

async function performRotation() {
    // console.debug("[Gemini Nexus] Keeping session alive...");
    try {
        // This endpoint refreshes __Secure-1PSIDTS
        // We rely on the browser attaching cookies for accounts.google.com due to host_permissions
        const response = await fetch("https://accounts.google.com/RotateCookies", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            // Using the raw string from Python implementation to ensure exact compatibility.
            // Note: 000 is not valid JSON number format (leading zeros), so we send it as raw body string.
            body: '[000,"-0000000000000000000"]'
        });

        if (response.ok) {
            // console.debug("[Gemini Nexus] Cookie rotation successful");
        } else {
            console.warn("[Gemini Nexus] Cookie rotation failed:", response.status);
        }
    } catch (e) {
        console.error("[Gemini Nexus] Keep-alive error:", e);
    }
}
