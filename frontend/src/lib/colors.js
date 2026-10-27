export const SENSOR_COLORS = {
  MODIS: "#ffb547",
  VIIRS: "#3dd6f5",
};

export const PLATFORM_COLORS = {
  terra: "#ffb547",
  aqua: "#ff8a3d",
  snpp: "#3dd6f5",
  noaa20: "#7fe7ff",
  noaa21: "#2f9cff",
};

export const PLATFORM_LABELS = {
  terra: "Terra MODIS",
  aqua: "Aqua MODIS",
  snpp: "S-NPP VIIRS",
  noaa20: "NOAA-20 VIIRS",
  noaa21: "NOAA-21 VIIRS",
};

export const CLASS_COLORS = {
  AGRICULTURAL: "#5bd69a",
  WILDLAND: "#ff8a3d",
  INDUSTRIAL: "#c47dff",
  UNKNOWN: "#8a93a6",
  USER: "#b18cff",
};

export const CLASS_LABELS = {
  AGRICULTURAL: "Crop / agricultural",
  WILDLAND: "Forest / wildland",
  INDUSTRIAL: "Industrial / static",
  UNKNOWN: "UNKNOWN (abstained)",
  USER: "Your uploaded data",
};

export const DAYNIGHT_COLORS = {
  D: "#ffd36b",
  N: "#8f7dff",
};

const FRP_STOPS = [
  [0, [58, 42, 16]],
  [5, [201, 132, 24]],
  [20, [255, 93, 108]],
  [80, [255, 241, 201]],
];

export function frpColor(frp) {
  let lower = FRP_STOPS[0];
  let upper = FRP_STOPS[FRP_STOPS.length - 1];
  for (let i = 0; i < FRP_STOPS.length - 1; i = i + 1) {
    if (frp >= FRP_STOPS[i][0] && frp <= FRP_STOPS[i + 1][0]) {
      lower = FRP_STOPS[i];
      upper = FRP_STOPS[i + 1];
    }
  }
  if (frp > FRP_STOPS[FRP_STOPS.length - 1][0]) {
    lower = upper;
  }
  let t = 0;
  if (upper[0] > lower[0]) {
    t = (frp - lower[0]) / (upper[0] - lower[0]);
  }
  const rgb = [0, 1, 2].map((i) => Math.round(lower[1][i] + t * (upper[1][i] - lower[1][i])));
  return "rgb(" + rgb.join(",") + ")";
}

export function pointColor(point, colorBy) {
  if (point.cls === "USER") {
    return CLASS_COLORS.USER;
  }
  if (colorBy === "platform") {
    return PLATFORM_COLORS[point.platform] || "#ffffff";
  }
  if (colorBy === "class") {
    return CLASS_COLORS[point.cls] || CLASS_COLORS.UNKNOWN;
  }
  if (colorBy === "frp") {
    return frpColor(point.frp || 0);
  }
  if (colorBy === "daynight") {
    return DAYNIGHT_COLORS[point.dn] || "#ffffff";
  }
  return SENSOR_COLORS[point.sensor] || "#ffffff";
}

export function densityColor(t) {
  const stops = [[0, [26, 157, 186]], [0.35, [255, 181, 71]], [0.7, [255, 93, 108]], [1, [255, 241, 201]]];
  let lower = stops[0];
  let upper = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i = i + 1) {
    if (t >= stops[i][0] && t <= stops[i + 1][0]) {
      lower = stops[i];
      upper = stops[i + 1];
    }
  }
  let f = 0;
  if (upper[0] > lower[0]) {
    f = (t - lower[0]) / (upper[0] - lower[0]);
  }
  const rgb = [0, 1, 2].map((i) => Math.round(lower[1][i] + f * (upper[1][i] - lower[1][i])));
  return "rgba(" + rgb.join(",") + ",0.92)";
}
