import { FRONTEND_ORIGIN, FRONTEND_URL, MESSAGE_TYPES } from "./modules/constants.js";
import { saveSong } from "./modules/api.js";
import { getSelectedLibraryId, setExtensionToken } from "./modules/storage.js";
import { isSupportedYouTubeUrl } from "./modules/youtube.js";

chrome.action.onClicked.addListener((tab) => {
  saveActiveSong(tab).catch((error) => {
    console.warn("Unable to save the active song.", error.message);
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === MESSAGE_TYPES.storeToken) {
    storeTokenFromFrontend(message, sender)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message?.type === MESSAGE_TYPES.saveActiveSong) {
    const youtubeUrl = typeof message.youtubeUrl === "string"
      ? message.youtubeUrl
      : sender?.tab?.url;
    saveSongForUrl(youtubeUrl)
      .then(() => {
        showSaveStatus(sender.tab?.id, true);
        sendResponse({ ok: true });
      })
      .catch((error) => {
        console.warn("Unable to save the requested song.", error.message);
        showSaveStatus(sender.tab?.id, false, error.message);
        sendResponse({ ok: false, message: error.message });
      });
    return true;
  }

  return false;
});

async function saveActiveSong(tab) {
  try {
    await saveSongForUrl(tab?.url);
    showSaveStatus(tab?.id, true);
  } catch (error) {
    showSaveStatus(tab?.id, false, error.message);
    throw error;
  }
}

async function saveSongForUrl(activeUrl) {
  if (!isSupportedYouTubeUrl(activeUrl)) {
    throw new Error("The active tab is not a supported YouTube video.");
  }

  const libraryId = await getSelectedLibraryId();
  if (!libraryId) {
    throw new Error("Select a library before saving a song.");
  }

  await saveSong(libraryId, activeUrl);
}

function showSaveStatus(tabId, saved, errorMessage = "") {
  const badgeDetails = typeof tabId === "number" ? { tabId } : {};
  chrome.action.setBadgeText({
    ...badgeDetails,
    text: saved ? "✓" : "!"
  });
  chrome.action.setBadgeBackgroundColor({
    ...badgeDetails,
    color: saved ? "#16a34a" : "#dc2626"
  });
  chrome.action.setTitle({
    ...badgeDetails,
    title: saved
      ? "NightWrapUp: song saved"
      : `NightWrapUp: ${errorMessage || "song was not saved"}`
  });
}

async function storeTokenFromFrontend(message, sender) {
  if (!isTrustedFrontendSender(sender)) {
    throw new Error("Untrusted token sender.");
  }
  await setExtensionToken(message.token);
}

function isTrustedFrontendSender(sender) {
  if (sender?.origin) {
    return sender.origin === FRONTEND_ORIGIN;
  }
  return typeof sender?.url === "string" && sender.url.startsWith(`${FRONTEND_URL}`);
}
