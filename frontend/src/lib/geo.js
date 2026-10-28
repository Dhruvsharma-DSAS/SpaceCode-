const EARTH_RADIUS_KM = 6371.0088;

export function localSolarHour(utcHour, lon) {
  return (((utcHour + lon / 15) % 24) + 24) % 24;
}

export function utcHourFromHHMM(hhmm) {
  const text = String(hhmm).padStart(4, "0");
  return Number(text.slice(0, 2)) + Number(text.slice(2, 4)) / 60;
}

export function formatHour(hour) {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  if (m === 60) {
    return String((h + 1) % 24).padStart(2, "0") + ":00";
  }
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

export function wrapLon(lon) {
  return (((lon + 180) % 360) + 360) % 360 - 180;
}

export function cellIndex(lat, lon, size) {
  if (lat < -90 || lat > 90) {
    return null;
  }
  let row = Math.floor(Number(((lat + 90) / size).toFixed(9)));
  let col = Math.floor(Number(((wrapLon(lon) + 180) / size).toFixed(9)));
  const maxRow = Math.round(180 / size) - 1;
  const maxCol = Math.round(360 / size) - 1;
  if (row > maxRow) {
    row = maxRow;
  }
  if (col > maxCol) {
    col = maxCol;
  }
  return { row: row, col: col, id: row + "_" + col };
}

export function cellAreaKm2(row, size) {
  const south = ((-90 + row * size) * Math.PI) / 180;
  const north = ((-90 + (row + 1) * size) * Math.PI) / 180;
  const dlon = (size * Math.PI) / 180;
  return EARTH_RADIUS_KM * EARTH_RADIUS_KM * dlon * (Math.sin(north) - Math.sin(south));
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = p2 - p1;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export function nearestPoint(points, lat, lon, maxKm) {
  let best = null;
  let bestKm = maxKm;
  points.forEach((point) => {
    if (Math.abs(point.lat - lat) > 3) {
      return;
    }
    const km = haversineKm(lat, lon, point.lat, point.lon);
    if (km < bestKm) {
      bestKm = km;
      best = point;
    }
  });
  return best;
}

function ringContains(ring, lon, lat) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i = i + 1) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function polygonContains(rings, lon, lat) {
  if (!ringContains(rings[0], lon, lat)) {
    return false;
  }
  for (let k = 1; k < rings.length; k = k + 1) {
    if (ringContains(rings[k], lon, lat)) {
      return false;
    }
  }
  return true;
}

export function countryAt(features, lat, lon) {
  const found = (features || []).find((f) => {
    const g = f.geometry;
    if (!g) {
      return false;
    }
    if (g.type === "Polygon") {
      return polygonContains(g.coordinates, lon, lat);
    }
    if (g.type === "MultiPolygon") {
      return g.coordinates.some((poly) => polygonContains(poly, lon, lat));
    }
    return false;
  });
  if (!found) {
    return null;
  }
  return found.properties;
}

export function isDaylight(lat, lon, sun) {
  const p1 = (lat * Math.PI) / 180;
  const p2 = (sun.lat * Math.PI) / 180;
  const dl = ((lon - sun.lon) * Math.PI) / 180;
  const cosAngle = Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dl);
  return cosAngle > 0;
}

export function inBbox(point, bbox) {
  return point.lon >= bbox[0] && point.lon <= bbox[2] && point.lat >= bbox[1] && point.lat <= bbox[3];
}
