const BUTTON_ID = "nightwrapup-frontend-button";
const OPEN_SAVE_INTERFACE = "OPEN_SAVE_INTERFACE";
const POSITION_KEY = "frontendFloatingButtonPosition";

createFrontendButton();

function createFrontendButton() {
  if (document.getElementById(BUTTON_ID)) {
    return;
  }

  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.type = "button";
  button.title = "Open NightWrapUp save interface";
  button.setAttribute("aria-label", "Open NightWrapUp save interface");
  button.style.display = "block";
  button.textContent = "N";
  button.addEventListener("pointerdown", startDragging);
  button.addEventListener("click", (event) => {
    if (button.dataset.dragged === "true") {
      button.dataset.dragged = "false";
      event.preventDefault();
      return;
    }
    chrome.runtime.sendMessage({ type: OPEN_SAVE_INTERFACE });
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
    button.style.left = `${clamp(startRect.left + deltaX, 0, window.innerWidth - startRect.width)}px`;
    button.style.top = `${clamp(startRect.top + deltaY, 0, window.innerHeight - startRect.height)}px`;
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
    if (!position || typeof position.left !== "number" || typeof position.top !== "number") {
      return;
    }
    button.style.left = `${clamp(position.left, 0, window.innerWidth - button.offsetWidth)}px`;
    button.style.top = `${clamp(position.top, 0, window.innerHeight - button.offsetHeight)}px`;
    button.style.right = "auto";
    button.style.bottom = "auto";
  }).catch(() => {});
}

function savePosition(button) {
  chrome.storage.local.set({
    [POSITION_KEY]: {
      left: button.getBoundingClientRect().left,
      top: button.getBoundingClientRect().top
    }
  }).catch(() => {});
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}
