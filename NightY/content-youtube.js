const BUTTON_ID = "nightwrapup-save-button";
const SAVE_ACTIVE_SONG = "SAVE_ACTIVE_SONG";
const POSITION_KEY = "floatingButtonPosition";
let lastUrl = "";

function createRobotMarkup() {
  return `
    <svg class="nw-logo" viewBox="0 0 42 42" xmlns="http://www.w3.org/2000/svg">
      <path class="nw-logo-moon"
        d="M28 8a14.5 14.5 0 0 1-3 20.6A14.5 14.5 0 0 0 28 8Z
           M14 4.5a16 16 0 1 0 11.3 27.4A12 12 0 0 1 14 4.5Z"
        stroke-linecap="round" stroke-linejoin="round"/>
      <path class="nw-logo-note"
        d="M24 14v12.5a3 3 0 1 1-2-2.83V17.5l-6 1.5v9.5a3 3 0 1 1-2-2.83V16l10-2.5Z"/>
    </svg>
    <span class="nw-particle nw-particle-one"></span>
    <span class="nw-particle nw-particle-two"></span>
    <span class="nw-particle nw-particle-three"></span>`;
}


function updateButton() {
  const url = window.location.href;
  const supported = isSupportedYouTubeUrl(url);
  const existingButton = document.getElementById(BUTTON_ID);

  if (!supported) {
    existingButton?.remove();
    lastUrl = url;
    return;
  }

  if (existingButton || lastUrl === url) {
    return;
  }

  lastUrl = url;
  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.type = "button";
  button.title = "Save to NightWrapUp";
  button.setAttribute("aria-label", "Save this video to NightWrapUp");
  button.innerHTML = createRobotMarkup();
  button.addEventListener("pointerdown", startDragging);
  button.addEventListener("click", (event) => {
    if (button.dataset.dragged === "true") {
      button.dataset.dragged = "false";
      event.preventDefault();
      return;
    }
    button.dataset.saveState = "saving";
    button.title = "Saving song to NightWrapUp...";
    chrome.runtime.sendMessage({
      type: SAVE_ACTIVE_SONG,
      youtubeUrl: window.location.href
    }, (response) => {
      if (chrome.runtime.lastError || !response?.ok) {
        button.dataset.saveState = "error";
        button.title = response?.message || "NightWrapUp could not save this song.";
        return;
      }
      button.dataset.saveState = "saved";
      button.title = "Song saved to your selected NightWrapUp library.";
      window.setTimeout(() => {
        if (button.isConnected) button.dataset.saveState = "";
      }, 3000);
    });
  });
  document.documentElement.appendChild(button);
  updateConnectionState(button);
  restorePosition(button);
}

function updateConnectionState(button = document.getElementById(BUTTON_ID)) {
  if (!button) return;
  chrome.storage.local.get("extensionToken").then((values) => {
    button.dataset.connected = typeof values.extensionToken === "string" &&
      values.extensionToken.trim() !== "" ? "true" : "false";
  }).catch(() => {
    button.dataset.connected = "false";
  });
}

function startDragging(event) {
  if (event.button !== 0) return;

  const button = event.currentTarget;
  const startX = event.clientX;
  const startY = event.clientY;
  const startRect = button.getBoundingClientRect();
  let moved = false;

  button.setPointerCapture(event.pointerId);

  const move = (moveEvent) => {
    const deltaX = moveEvent.clientX - startX;
    const deltaY = moveEvent.clientY - startY;
    if (!moved && Math.hypot(deltaX, deltaY) < 4) return;

    moved = true;
    button.dataset.dragged = "true";
    const left = clamp(startRect.left + deltaX, 0, window.innerWidth - startRect.width);
    const top = clamp(startRect.top + deltaY, 0, window.innerHeight - startRect.height);
    button.style.left = `${left}px`;
    button.style.top = `${top}px`;
    button.style.right = "auto";
    button.style.bottom = "auto";
  };

  const stop = () => {
    button.removeEventListener("pointermove", move);
    button.removeEventListener("pointerup", stop);
    button.removeEventListener("pointercancel", stop);
    if (moved) savePosition(button);
  };

  button.addEventListener("pointermove", move);
  button.addEventListener("pointerup", stop);
  button.addEventListener("pointercancel", stop);
}

function restorePosition(button) {
  chrome.storage.local.get(POSITION_KEY).then((values) => {
    const position = values[POSITION_KEY];
    if (
      !position ||
      typeof position.left !== "number" ||
      typeof position.top !== "number"
    ) {
      return;
    }
    const left = clamp(position.left, 0, window.innerWidth - button.offsetWidth);
    const top = clamp(position.top, 0, window.innerHeight - button.offsetHeight);
    button.style.left = `${left}px`;
    button.style.top = `${top}px`;
    button.style.right = "auto";
    button.style.bottom = "auto";
  }).catch(() => {
    // The default CSS position remains available if storage is unavailable.
  });
}

function savePosition(button) {
  chrome.storage.local.set({
    [POSITION_KEY]: {
      left: button.getBoundingClientRect().left,
      top: button.getBoundingClientRect().top
    }
  }).catch(() => {
    // Moving the button still works for the current page if persistence fails.
  });
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

function isSupportedYouTubeUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return false;
    if (url.hostname === "youtu.be") {
      return Boolean(url.pathname.split("/").filter(Boolean)[0]);
    }
    if (
      !["www.youtube.com", "youtube.com", "music.youtube.com"].includes(
        url.hostname
      )
    ) {
      return false;
    }
    return url.pathname === "/watch"
      ? Boolean(url.searchParams.get("v"))
      : url.pathname.startsWith("/shorts/") &&
        Boolean(url.pathname.split("/").filter(Boolean)[1]);
  } catch {
    return false;
  }
}

updateButton();
setInterval(() => {
  updateButton();
  updateConnectionState();
}, 1000);
