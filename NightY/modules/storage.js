import { STORAGE_KEYS } from "./constants.js";

export async function getExtensionToken() {
  const values = await chrome.storage.local.get(STORAGE_KEYS.extensionToken);
  return typeof values[STORAGE_KEYS.extensionToken] === "string"
    ? values[STORAGE_KEYS.extensionToken]
    : null;
}

export async function setExtensionToken(extensionToken) {
  if (typeof extensionToken !== "string" || extensionToken.trim() === "") {
    throw new Error("The extension token is invalid.");
  }
  await chrome.storage.local.set({
    [STORAGE_KEYS.extensionToken]: extensionToken.trim()
  });
}

export async function clearExtensionToken() {
  await chrome.storage.local.remove(STORAGE_KEYS.extensionToken);
}

export async function getSelectedLibraryId() {
  const values = await chrome.storage.local.get(STORAGE_KEYS.selectedLibraryId);
  return typeof values[STORAGE_KEYS.selectedLibraryId] === "string"
    ? values[STORAGE_KEYS.selectedLibraryId]
    : "";
}

export async function setSelectedLibraryId(libraryId) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.selectedLibraryId]: libraryId
  });
}
