const API_BASE = import.meta.env.VITE_API_URL || "";

export async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error("HTTP " + response.status + " for " + path);
  }
  return response.json();
}

export async function fetchApiOrFixture(apiPath, fixturePath) {
  try {
    const result = await fetchJson(API_BASE + apiPath);
    if (result && result.meta) {
      return result;
    }
  } catch (error) {
    console.info("API not reachable, using fixture:", apiPath);
  }
  const fixture = await fetchJson(fixturePath);
  fixture.meta = Object.assign({}, fixture.meta, { fallback_used: true });
  return fixture;
}

export function statusOf(meta) {
  if (!meta) {
    return "UNAVAILABLE";
  }
  if (meta.status) {
    return meta.status;
  }
  if (meta.demo) {
    return "SIMULATED";
  }
  return "ARCHIVE_STANDARD";
}
