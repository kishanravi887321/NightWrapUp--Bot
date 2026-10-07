const BUTTON_ID = "nightwrapup-save-button";
const OPEN_SAVE_INTERFACE = "OPEN_SAVE_INTERFACE";
const POSITION_KEY = "floatingButtonPosition";
let lastUrl = "";

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
  button.textContent = "N";
  button.addEventListener("pointerdown", startDragging);
  button.addEventListener("click", (event) => {
    if (button.dataset.dragged === "true") {
      button.dataset.dragged = "false";
      event.preventDefault();
      return;
    }
    chrome.runtime.sendMessage({
      type: OPEN_SAVE_INTERFACE,
      youtubeUrl: window.location.href
    });
  });
  document.documentElement.appendChild(button);
  restorePosition(button);
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
setInterval(updateButton, 1000);
