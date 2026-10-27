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
