# NightWrapUp browser extension

This is a modular Manifest V3 WebExtension for Chromium-compatible browsers:
Chrome, Microsoft Edge, and Brave.

## Install locally

1. Open the browser's extensions page (`chrome://extensions`,
   `edge://extensions`, or `brave://extensions`).
2. Enable Developer mode.
3. Choose **Load unpacked** and select this repository folder.
4. Open a supported YouTube video. The floating `N` button opens the save
   interface.

The extension uses the separate extension JWT delivered by the NightWrapUp web
application. It never reads website cookies or frontend `localStorage`.

## Project structure

- `background.js`: extension-page opening and token storage support.
- `content-bridge.js`: direct frontend localStorage-to-extension storage sync.
- `content-frontend.js`: movable frontend floating action button.
- `content-youtube.js`: non-invasive YouTube floating action.
- `modules/api.js`: authenticated API calls and status-aware errors.
- `modules/storage.js`: token and selected-library persistence.
- `modules/youtube.js`: supported URL parsing and validation.
- `popup.js`: shared popup/save-page UI controller.

## Debug mode

For development, set `debugMode: true` in `chrome.storage.local` from the
extension service worker console. Debug logging is intentionally limited to
safe diagnostic data; tokens and request headers are never logged.

## Frontend token synchronization

The extension content script is injected directly into:

```text
https://nightwrapup.ziax.online/*
```

It reads the frontend token directly from the same origin:

```js
localStorage.getItem("nightwrapup_extension_token")
```

It copies that value into extension-only storage:

```js
chrome.storage.local.set({ extensionToken: token });
```

The script also synchronizes later login/logout changes. No `postMessage`,
connection query parameter, or manual copy/paste is used.

After changing extension files, reload the unpacked extension from the
browser's extensions page and reload the NightWrapUp connection tab.

The frontend also displays a movable `N` button. Its position is stored
separately from the YouTube button, so each website keeps its own layout.
