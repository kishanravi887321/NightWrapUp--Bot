import { API_BASE_URL } from "./constants.js";
import { clearExtensionToken, getExtensionToken } from "./storage.js";

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path, options = {}) {
  const token = await getExtensionToken();
  if (!token) {
    throw new ApiError("Connect NightWrapUp before using the extension.", 401);
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...options.headers
  };

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers
    });
  } catch {
    throw new ApiError(
      "Network error. Check your connection and try again.",
      0
    );
  }

  const result = await readResponse(response);
  if (!response.ok) {
    if (response.status === 401) {
      await clearExtensionToken();
    }
    throw new ApiError(
      getErrorMessage(result, messageForStatus(response.status)),
      response.status
    );
  }

  return result?.data;
}

async function readResponse(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getErrorMessage(result, fallback) {
  return typeof result?.message === "string" && result.message.trim()
    ? result.message
    : fallback;
}

function messageForStatus(status) {
  if (status === 400) return "This is not a supported YouTube video URL.";
  if (status === 404) return "The selected library was not found.";
  if (status === 409) return "This song conflicts with an existing resource.";
  if (status >= 500) return "NightWrapUp is temporarily unavailable.";
  return `Request failed with status ${status}.`;
}

export function loadLibraries() {
  return request("/extension/libraries", { method: "GET" });
}

export function createLibrary(name, description = "") {
  return request("/extension/libraries", {
    method: "POST",
    body: JSON.stringify({ name, description })
  });
}

export function saveSong(libraryId, youtubeUrl) {
  return request(`/extension/libraries/${encodeURIComponent(libraryId)}/songs`, {
    method: "PUT",
    body: JSON.stringify({ youtubeUrl })
  });
}
