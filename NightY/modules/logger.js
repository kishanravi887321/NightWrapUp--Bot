const DEBUG_STORAGE_KEY = "debugMode";

export async function isDebugEnabled() {
  const values = await chrome.storage.local.get(DEBUG_STORAGE_KEY);
  return values[DEBUG_STORAGE_KEY] === true;
}

export async function debugLog(message, details = {}) {
  if (await isDebugEnabled()) {
    console.debug(`[NightWrapUp] ${message}`, details);
  }
}
