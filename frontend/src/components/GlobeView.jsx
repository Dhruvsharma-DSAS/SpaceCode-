import { useEffect, useState } from "react";
import Globe from "globe.gl";
import * as THREE from "three";
import { pointColor, densityColor, PLATFORM_COLORS, PLATFORM_LABELS } from "../lib/colors.js";
import { nearestPoint } from "../lib/geo.js";
import { splitAtDateline, positionOf, trackOf, subsolarPoint } from "../lib/orbits.js";

const BASEMAP_URLS = {
  bluemarble: "/textures/earth-blue-marble.jpg",
  night: "/textures/earth-night.jpg",
  day: "/textures/earth-day.jpg",
  dark: "/textures/earth-dark.jpg",
};

const DENSITY_SCALE = 90;

function pointLabelHtml(point) {
  const name = point.country || "open ocean / no country";
  return (
    '<div class="globe-tip"><b>' + PLATFORM_LABELS[point.platform] + "</b><br/>" +
    point.lat.toFixed(3) + "°, " + point.lon.toFixed(3) + "° · " + name + "<br/>" +
    point.date + " " + point.utc + " UTC · FRP " + point.frp + " MW</div>"
  );
}

function hexLabelHtml(hex) {
  return '<div class="globe-tip"><b>' + hex.points.length + " detections</b><br/>in this hexagon (H3 res 3)</div>";
}

function makeHtmlElement(d) {
  const element = document.createElement("div");
  element.style.pointerEvents = "none";
  if (d.kind === "pin") {
    element.className = "pin-card";
    element.innerHTML = d.html;
    return element;
  }
  element.className = "sat-label";
  element.style.color = PLATFORM_COLORS[d.id] || "#ffffff";
  element.textContent = "● " + d.short;
  return element;
}

function pushHtml(g) {
  g.htmlElementsData(g.__fcHtml.sats.concat(g.__fcHtml.pin));
}

function shortName(sat) {
  if (sat.id === "snpp") {
    return "S-NPP";
  }
  if (sat.id === "noaa20") {
    return "NOAA-20";
  }
  if (sat.id === "noaa21") {
    return "NOAA-21";
  }
  return sat.name;
}

function buildTracks(satellites, now) {
  const tracks = [];
  satellites.forEach((sat) => {
    const points = trackOf(sat, now, 50, 50, 1);
    splitAtDateline(points).forEach((segment) => {
      tracks.push({ id: sat.id, color: PLATFORM_COLORS[sat.id] || "#ffffff", points: segment });
    });
  });
  return tracks;
}

function buildSatPositions(satellites, now) {
  return satellites.map((sat) => {
    const p = positionOf(sat, now);
    return { id: sat.id, name: sat.name, short: shortName(sat), lat: p.lat, lon: p.lon, alt: 0.12 };
  });
}

export default function GlobeView(props) {
  const hostId = props.hostId || "globe-host";
  const [globe, setGlobe] = useState(null);

  useEffect(() => {
    const host = document.getElementById(hostId);
    if (!host) {
      return undefined;
    }
    const g = new Globe(host, { animateIn: true });
    g.backgroundColor("rgba(0,0,0,0)")
      .backgroundImageUrl("/textures/night-sky.png")
      .bumpImageUrl("/textures/earth-topology.png")
      .showAtmosphere(true)
      .atmosphereColor("#6fc3ff")
      .atmosphereAltitude(0.2)
      .pointLat("lat")
      .pointLng("lon")
      .pointResolution(6)
      .pointsTransitionDuration(400)
      .hexBinPointLat("lat")
      .hexBinPointLng("lon")
      .hexBinResolution(3)
      .hexMargin(0.18)
      .hexTransitionDuration(500)
      .hexLabel(hexLabelHtml)
      .polygonCapColor(() => "rgba(0,0,0,0)")
      .polygonSideColor(() => "rgba(0,0,0,0)")
      .polygonStrokeColor(() => "rgba(230,237,243,0.30)")
      .polygonAltitude(0.003)
      .polygonLabel((feature) => '<div class="globe-tip">' + feature.properties.name + "</div>")
      .pathPoints("points")
      .pathPointLat((p) => p[0])
      .pathPointLng((p) => p[1])
      .pathColor((track) => [track.color, track.color])
      .pathStroke(1.4)
      .pathDashLength(0.06)
      .pathDashGap(0.012)
      .pathDashAnimateTime(16000)
      .pathTransitionDuration(0)
      .htmlLat("lat")
      .htmlLng("lon")
      .htmlAltitude("alt")
      .htmlElement(makeHtmlElement)
      .htmlTransitionDuration(900)
      .ringLat("lat")
      .ringLng("lon")
      .ringColor(() => (t) => "rgba(255,93,108," + (1 - t) + ")")
      .ringMaxRadius(2.6)
      .ringPropagationSpeed(2.2)
      .ringRepeatPeriod(1100);
    g.pointOfView({ lat: props.startLat || 18, lng: props.startLng || 40, altitude: props.startAltitude || 2.3 }, 0);
    const controls = g.controls();
    controls.autoRotateSpeed = 0.45;
    controls.enableDamping = true;
    function resize() {
      g.width(host.clientWidth);
      g.height(host.clientHeight);
    }
    resize();
    window.addEventListener("resize", resize);
    g.__fcHtml = { sats: [], pin: [] };
    setGlobe(() => g);
    return () => {
      window.removeEventListener("resize", resize);
      g._destructor();
      host.innerHTML = "";
    };
  }, [hostId]);

  useEffect(() => {
    if (!globe) {
      return;
    }
    const material = globe.globeMaterial();
    if (props.basemap === "atlas") {
      globe.globeImageUrl(null).bumpImageUrl(null).backgroundImageUrl(null).atmosphereColor("#3d6fb5").atmosphereAltitude(0.14);
      material.color = new THREE.Color("#17233b");
      material.emissive = new THREE.Color("#0b1324");
      material.shininess = 6;
    } else {
      globe.globeImageUrl(BASEMAP_URLS[props.basemap] || BASEMAP_URLS.bluemarble).bumpImageUrl("/textures/earth-topology.png").backgroundImageUrl("/textures/night-sky.png").atmosphereColor("#6fc3ff").atmosphereAltitude(0.2);
      material.color = new THREE.Color("#ffffff");
      material.emissive = new THREE.Color("#000000");
    }
    material.needsUpdate = true;
  }, [globe, props.basemap]);

  useEffect(() => {
    if (!globe || !props.terminator) {
      return undefined;
    }
    const radius = globe.getGlobeRadius() * 1.004;
    const geometry = new THREE.SphereGeometry(radius, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const shade = new THREE.MeshBasicMaterial({ color: 0x01040b, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.FrontSide });
    const mesh = new THREE.Mesh(geometry, shade);
    function place() {
      const sun = subsolarPoint(new Date());
      const night = globe.getCoords(-sun.lat, sun.lon + 180, 0);
      const dir = new THREE.Vector3(night.x, night.y, night.z).normalize();
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    }
    place();
    globe.scene().add(mesh);
    const timer = setInterval(place, 60000);
    return () => {
      clearInterval(timer);
      globe.scene().remove(mesh);
      geometry.dispose();
      shade.dispose();
    };
  }, [globe, props.terminator]);

  useEffect(() => {
    if (!globe) {
      return undefined;
    }
    const controls = globe.controls();
    let timer = null;
    controls.autoRotate = Boolean(props.autoRotate);
    function onStart() {
      controls.autoRotate = false;
      if (timer) {
        clearTimeout(timer);
      }
    }
    function onEnd() {
      if (props.autoRotate) {
        timer = setTimeout(() => {
          controls.autoRotate = true;
        }, 10000);
      }
    }
    controls.addEventListener("start", onStart);
    controls.addEventListener("end", onEnd);
    return () => {
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("end", onEnd);
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [globe, props.autoRotate]);

  useEffect(() => {
    if (!globe) {
      return;
    }
    const layers = props.layers || {};
    const points = props.points || [];
    let shown = [];
    if (layers.points !== false) {
      shown = points;
    }
    const radius = props.pointRadius || 0.17;
    globe
      .pointsMerge(shown.length > (props.mergeAbove || 3500))
      .pointColor((point) => pointColor(point, props.colorBy))
      .pointRadius((point) => {
        if (props.selected && point.id === props.selected.id) {
          return radius * 2.4;
        }
        return radius;
      })
      .pointAltitude((point) => {
        let a = 0.003 + Math.min(props.spikeMax || 0.02, Math.log1p(point.frp || 0) / 220);
        if (props.selected && point.id === props.selected.id) {
          a = a + 0.04;
        }
        return a;
      })
      .pointLabel(pointLabelHtml)
      .pointsData(shown);
  }, [globe, props.points, props.colorBy, props.layers, props.selected, props.pointRadius]);

  useEffect(() => {
    if (!globe) {
      return;
    }
    const layers = props.layers || {};
    let data = [];
    if (layers.density) {
      data = props.points || [];
    }
    globe
      .hexAltitude((hex) => 0.01 + 0.3 * Math.pow(Math.min(1, hex.points.length / DENSITY_SCALE), 0.7))
      .hexTopColor((hex) => densityColor(Math.min(1, hex.points.length / DENSITY_SCALE)))
      .hexSideColor((hex) => densityColor(Math.min(1, hex.points.length / DENSITY_SCALE)))
      .hexBinMerge(true)
      .hexBinPointsData(data);
  }, [globe, props.points, props.layers]);

  useEffect(() => {
    if (!globe) {
      return;
    }
    const layers = props.layers || {};
    let data = [];
    if (layers.borders !== false && props.countries) {
      data = props.countries;
    }
    const atlas = props.basemap === "atlas";
    const highlight = props.highlight || "";
    globe
      .polygonCapColor((feature) => {
        if (highlight && feature.properties.iso3 === highlight) {
          return "rgba(255,77,94,0.2)";
        }
        if (atlas) {
          return "rgba(120,150,205,0.13)";
        }
        return "rgba(0,0,0,0)";
      })
      .polygonStrokeColor((feature) => {
        if (highlight && feature.properties.iso3 === highlight) {
          return "rgba(255,122,92,0.95)";
        }
        return "rgba(230,237,243,0.22)";
      })
      .polygonAltitude((feature) => {
        if (highlight && feature.properties.iso3 === highlight) {
          return 0.007;
        }
        return 0.003;
      })
      .polygonsData(data);
  }, [globe, props.countries, props.layers, props.highlight, props.basemap]);

  useEffect(() => {
    if (!globe) {
      return undefined;
    }
    const layers = props.layers || {};
    const satellites = props.satellites || [];
    if (!layers.tracks || satellites.length === 0) {
      globe.pathsData([]);
      globe.__fcHtml.sats = [];
      pushHtml(globe);
      return undefined;
    }
    function tick() {
      globe.__fcHtml.sats = buildSatPositions(satellites, new Date());
      pushHtml(globe);
    }
    globe.pathsData(buildTracks(satellites, new Date()));
    tick();
    const moveTimer = setInterval(tick, 2000);
    const trackTimer = setInterval(() => {
      globe.pathsData(buildTracks(satellites, new Date()));
    }, 60000);
    return () => {
      clearInterval(moveTimer);
      clearInterval(trackTimer);
    };
  }, [globe, props.satellites, props.layers]);

  useEffect(() => {
    if (!globe) {
      return;
    }
    const layers = props.layers || {};
    const rings = [];
    if (layers.rings !== false) {
      const sorted = (props.points || []).slice().sort((a, b) => b.frp - a.frp);
      sorted.slice(0, props.ringCount || 10).forEach((point) => {
        rings.push({ lat: point.lat, lon: point.lon });
      });
    }
    if (props.selected) {
      rings.push({ lat: props.selected.lat, lon: props.selected.lon });
    }
    if (props.pin) {
      rings.push({ lat: props.pin.lat, lon: props.pin.lon });
    }
    globe.ringsData(rings);
  }, [globe, props.points, props.layers, props.selected, props.ringCount, props.pin]);

  useEffect(() => {
    if (!globe) {
      return;
    }
    let pin = [];
    if (props.pin) {
      pin = [{ kind: "pin", lat: props.pin.lat, lon: props.pin.lon, alt: 0.012, html: props.pin.html }];
    }
    globe.__fcHtml.pin = pin;
    pushHtml(globe);
  }, [globe, props.pin]);

  useEffect(() => {
    if (!globe) {
      return;
    }
    const points = props.points || [];
    const reach = props.pickKm || 150;
    function report(coords, point, hex) {
      if (!coords) {
        return;
      }
      let found = point;
      if (!found) {
        found = nearestPoint(points, coords.lat, coords.lng, reach);
      }
      if (props.onProbe) {
        props.onProbe({ lat: coords.lat, lon: coords.lng, point: found, hex: hex || null });
        return;
      }
      if (props.onSelect) {
        props.onSelect(found);
      }
    }
    globe.onPointClick((point, event, coords) => {
      if (point && typeof point.lat === "number") {
        report({ lat: point.lat, lng: point.lon }, point, null);
        return;
      }
      report(coords, null, null);
    });
    globe.onGlobeClick((coords) => report(coords, null, null));
    globe.onPolygonClick((polygon, event, coords) => report(coords, null, null));
    globe.onHexClick((hex, event, coords) => {
      let first = null;
      if (hex.points.length > 0) {
        first = hex.points[0];
      }
      let at = coords;
      if (!at && first) {
        at = { lat: first.lat, lng: first.lon };
      }
      report(at, first, hex.points);
    });
  }, [globe, props.points, props.onSelect, props.onProbe, props.pickKm]);

  useEffect(() => {
    if (!globe || !props.selected) {
      return;
    }
    globe.controls().autoRotate = false;
    if (props.keepCamera) {
      return;
    }
    const pov = globe.pointOfView();
    globe.pointOfView({ lat: props.selected.lat, lng: props.selected.lon, altitude: Math.min(pov.altitude, 2.0) }, 900);
  }, [globe, props.selected, props.keepCamera]);

  useEffect(() => {
    if (!globe || !props.flyTo) {
      return;
    }
    globe.pointOfView({ lat: props.flyTo.lat, lng: props.flyTo.lng, altitude: props.flyTo.altitude || 1.6 }, 1200);
  }, [globe, props.flyTo]);

  return <div id={hostId} className="globe-host" />;
}
