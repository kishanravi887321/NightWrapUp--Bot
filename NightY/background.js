import { FRONTEND_ORIGIN, FRONTEND_URL, MESSAGE_TYPES } from "./modules/constants.js";
import { setExtensionToken } from "./modules/storage.js";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === MESSAGE_TYPES.storeToken) {
    storeTokenFromFrontend(message, sender)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message?.type === MESSAGE_TYPES.openSaveInterface) {
    const youtubeUrl = typeof message.youtubeUrl === "string"
      ? message.youtubeUrl
      : sender?.tab?.url;
    const saveUrl = new URL(chrome.runtime.getURL("save.html"));
    if (youtubeUrl) {
      saveUrl.searchParams.set("youtubeUrl", youtubeUrl);
    }
    chrome.tabs.create({ url: saveUrl.toString() })
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  return false;
});

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
