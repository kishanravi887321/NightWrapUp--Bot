const FRONTEND_TOKEN_KEY = "nightwrapup_extension_token";
const EXTENSION_TOKEN_KEY = "extensionToken";

syncExtensionToken();

window.addEventListener("storage", (event) => {
  if (event.key === FRONTEND_TOKEN_KEY) {
    syncExtensionToken();
  }
});

const originalSetItem = localStorage.setItem.bind(localStorage);
localStorage.setItem = (key, value) => {
  originalSetItem(key, value);
  if (key === FRONTEND_TOKEN_KEY) {
    syncExtensionToken();
  }
};

const originalRemoveItem = localStorage.removeItem.bind(localStorage);
localStorage.removeItem = (key) => {
  originalRemoveItem(key);
  if (key === FRONTEND_TOKEN_KEY) {
    chrome.storage.local.remove(EXTENSION_TOKEN_KEY);
  }
};

function syncExtensionToken() {
  const token = localStorage.getItem(FRONTEND_TOKEN_KEY);
  if (typeof token === "string" && token.trim() !== "") {
    chrome.storage.local.set({ [EXTENSION_TOKEN_KEY]: token.trim() });
    return;
  }

  chrome.storage.local.remove(EXTENSION_TOKEN_KEY);
}
