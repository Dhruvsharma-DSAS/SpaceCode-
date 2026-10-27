import { fetchApiOrFixture, fetchJson } from "./client.js";

export function loadDetections(source, days) {
  const query = "?source=" + encodeURIComponent(source) + "&area=world&days=" + days;
  return fetchApiOrFixture("/api/detections" + query, "/data/detections_demo.json");
}

export function loadCountries() {
  return fetchJson("/data/countries.json");
}

export function loadSatellites() {
  return fetchApiOrFixture("/api/satellites", "/data/satellites.json");
}

export function loadRegions() {
  return fetchApiOrFixture("/api/regions", "/data/regions.json");
}

export function loadCalendar(region) {
  return fetchApiOrFixture("/api/calendar/" + region, "/data/calendar_demo.json");
}

export function loadFormulas() {
  return fetchApiOrFixture("/api/formulas", "/data/formulas.json");
}

export function loadHealth() {
  return fetchApiOrFixture("/api/health", "/data/health.json");
}
