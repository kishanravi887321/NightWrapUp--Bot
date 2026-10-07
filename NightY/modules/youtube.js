const YOUTUBE_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "music.youtube.com"
]);

export function getYouTubeVideoId(rawUrl) {
  if (typeof rawUrl !== "string" || rawUrl.trim() === "") {
    return null;
  }

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") {
    return null;
  }

  if (url.hostname === "youtu.be") {
    return firstPathSegment(url.pathname);
  }

  if (!YOUTUBE_HOSTS.has(url.hostname)) {
    return null;
  }

  if (url.pathname === "/watch") {
    return url.searchParams.get("v") || null;
  }

  if (url.pathname.startsWith("/shorts/")) {
    return firstPathSegment(url.pathname.slice("/shorts/".length));
  }

  return null;
}

function firstPathSegment(pathname) {
  const segment = pathname.split("/").filter(Boolean)[0];
  return segment || null;
}

export function isSupportedYouTubeUrl(rawUrl) {
  return getYouTubeVideoId(rawUrl) !== null;
}
