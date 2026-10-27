import { twoline2satrec, propagate, gstime, eciToGeodetic, degreesLat, degreesLong } from "satellite.js";

const DEG = Math.PI / 180;
const EARTH_ROTATION_DEG_PER_MIN = 360 / 1436.07;

function utcHoursOf(date) {
  return date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
}

function ascendingNodeLst(orbit) {
  if (orbit.node === "descending") {
    return (orbit.equator_lmst_h + 12) % 24;
  }
  return orbit.equator_lmst_h;
}

export function subSatellitePoint(orbit, date) {
  const periodMin = orbit.period_min;
  const inc = orbit.inclination_deg * DEG;
  const minutes = date.getTime() / 60000;
  const phase = ((minutes % periodMin) + periodMin) % periodMin;
  const u = (2 * Math.PI * phase) / periodMin;
  const startMinutes = minutes - phase;
  const startDate = new Date(startMinutes * 60000);
  const nodeLon = 15 * (ascendingNodeLst(orbit) - utcHoursOf(startDate));
  const lat = Math.asin(Math.sin(inc) * Math.sin(u)) / DEG;
  const dLon = Math.atan2(Math.cos(inc) * Math.sin(u), Math.cos(u)) / DEG;
  let lon = nodeLon + dLon - EARTH_ROTATION_DEG_PER_MIN * phase;
  lon = (((lon + 180) % 360) + 360) % 360 - 180;
  return { lat: lat, lon: lon };
}

export function groundTrack(orbit, date, minutesBack, minutesAhead, stepMin) {
  const points = [];
  for (let m = -minutesBack; m <= minutesAhead; m = m + stepMin) {
    const p = subSatellitePoint(orbit, new Date(date.getTime() + m * 60000));
    points.push([p.lat, p.lon]);
  }
  return points;
}

export function splitAtDateline(points) {
  const segments = [];
  let current = [];
  points.forEach((point, index) => {
    if (index > 0 && Math.abs(point[1] - points[index - 1][1]) > 180) {
      segments.push(current);
      current = [];
    }
    current.push(point);
  });
  if (current.length > 0) {
    segments.push(current);
  }
  return segments.filter((segment) => segment.length > 1);
}

export function tlePoint(tle, date) {
  const satrec = twoline2satrec(tle.line1, tle.line2);
  const state = propagate(satrec, date);
  if (!state || !state.position) {
    return null;
  }
  const geo = eciToGeodetic(state.position, gstime(date));
  return { lat: degreesLat(geo.latitude), lon: degreesLong(geo.longitude), heightKm: geo.height };
}

export function positionOf(sat, date) {
  if (sat.tle) {
    const p = tlePoint(sat.tle, date);
    if (p) {
      return p;
    }
  }
  return subSatellitePoint(sat.illustrative_orbit, date);
}

export function trackOf(sat, date, minutesBack, minutesAhead, stepMin) {
  const points = [];
  for (let m = -minutesBack; m <= minutesAhead; m = m + stepMin) {
    const p = positionOf(sat, new Date(date.getTime() + m * 60000));
    points.push([p.lat, p.lon]);
  }
  return points;
}

export function subsolarPoint(date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = (date.getTime() - start) / 86400000;
  const declination = -23.44 * Math.cos((2 * Math.PI * (dayOfYear + 10)) / 365);
  const lon = -15 * (utcHoursOf(date) - 12);
  return { lat: declination, lon: (((lon + 180) % 360) + 360) % 360 - 180 };
}
