import { FRONTEND_URL } from "./modules/constants.js";
import { ApiError, loadLibraries, saveSong } from "./modules/api.js";
import {
  clearExtensionToken,
  getExtensionToken,
  getSelectedLibraryId,
  setSelectedLibraryId
} from "./modules/storage.js";
import { isSupportedYouTubeUrl } from "./modules/youtube.js";

const statusElement = document.querySelector("#status");
const contentElement = document.querySelector("#content");

init();

async function init() {
  setStatus("Loading...", "loading");
  const token = await getExtensionToken();
  if (!token) {
    renderConnectState();
    return;
  }

  try {
    const libraries = await loadLibraries();
    renderSaveState(libraries, await getYouTubeUrl());
  } catch (error) {
    renderError(error);
  }

  async function getYouTubeUrl() {
    const queryUrl = new URLSearchParams(window.location.search).get("youtubeUrl");
    if (queryUrl) {
      return queryUrl;
    }
    const activeTab = await getActiveTab();
    return activeTab?.url;
  }
}

function renderConnectState() {
  setStatus("This extension is not connected.", "info");
  contentElement.replaceChildren(
    createText("Connect it through NightWrapUp to load your libraries."),
    createButton("Open NightWrapUp", () => {
      chrome.tabs.create({ url: `${FRONTEND_URL}?extension=connect` });
    }),
    createButton("Clear stored connection", async () => {
      await clearExtensionToken();
      setStatus("Stored connection cleared.", "success");
    }, "secondary")
  );
}

function renderSaveState(libraries, activeUrl) {
  if (!Array.isArray(libraries) || libraries.length === 0) {
    setStatus("No libraries found.", "info");
    contentElement.replaceChildren(
      createText("Create a library in NightWrapUp, then reload this view."),
      createButton("Open NightWrapUp", () => {
        chrome.tabs.create({ url: FRONTEND_URL });
      })
    );
    return;
  }

  if (!isSupportedYouTubeUrl(activeUrl)) {
    setStatus("Open a supported YouTube video first.", "error");
  } else {
    setStatus("Ready to save the active YouTube video.", "info");
  }

  const select = document.createElement("select");
  select.id = "library";
  select.setAttribute("aria-label", "Select a library");
  const savedLibraryIdPromise = getSelectedLibraryId();
  libraries.forEach((library) => {
    const option = document.createElement("option");
    option.value = library._id;
    option.textContent = library.name;
    select.appendChild(option);
  });

  savedLibraryIdPromise.then((savedLibraryId) => {
    if (libraries.some((library) => library._id === savedLibraryId)) {
      select.value = savedLibraryId;
    }
  });

  select.addEventListener("change", () => setSelectedLibraryId(select.value));
  const saveButton = createButton("Save to library", async () => {
    await saveCurrentSong(select.value, activeUrl, saveButton);
  });
  const refreshButton = createButton("Reload libraries", () => init(), "secondary");
  const disconnectButton = createButton("Disconnect", async () => {
    await clearExtensionToken();
    init();
  }, "secondary");

  contentElement.replaceChildren(
    createLabel("Library", select),
    saveButton,
    refreshButton,
    disconnectButton
  );
}

async function saveCurrentSong(libraryId, activeUrl, button) {
  if (!isSupportedYouTubeUrl(activeUrl)) {
    setStatus("Open a supported YouTube video first.", "error");
    return;
  }

  button.disabled = true;
  setStatus("Saving...", "loading");
  try {
    await saveSong(libraryId, activeUrl);
    setStatus("Song saved successfully.", "success");
  } catch (error) {
    renderError(error);
  } finally {
    button.disabled = false;
  }
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

function renderError(error) {
  const message = error instanceof ApiError
    ? error.message
    : "Something went wrong. Please try again.";
  setStatus(message, "error");
  contentElement.replaceChildren(
    createButton("Try again", () => init()),
    createButton("Open NightWrapUp", () => {
      chrome.tabs.create({ url: `${FRONTEND_URL}?extension=connect` });
    }, "secondary")
  );
}

function createText(text) {
  const element = document.createElement("p");
  element.textContent = text;
  return element;
}

function createLabel(text, control) {
  const label = document.createElement("label");
  label.textContent = text;
  label.appendChild(control);
  return label;
}

function createButton(text, handler, variant = "primary") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = variant;
  button.textContent = text;
  button.addEventListener("click", handler);
  return button;
}

function setStatus(message, type) {
  statusElement.textContent = message;
  statusElement.dataset.type = type;
}
