import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2];
const OUT = process.argv[3];
const WORK = process.argv[4];
const ONLY = process.argv[5] || "";
const W = 1500;
const H = 1200;
const PORT = 9333;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch() {
  const prof = join(WORK, "chrome-profile");
  rmSync(prof, { recursive: true, force: true });
  const proc = spawn(CHROME, ["--headless=new", "--remote-debugging-port=" + PORT, "--user-data-dir=" + prof, "--window-size=" + W + "," + H, "--hide-scrollbars", "--mute-audio", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-first-run", "--no-default-browser-check", "about:blank"], { stdio: "ignore" });
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch("http://127.0.0.1:" + PORT + "/json/version");
      if (r.ok) return proc;
    } catch (e) {}
    await sleep(200);
  }
  throw new Error("chrome did not start");
}

async function connect() {
  const r = await fetch("http://127.0.0.1:" + PORT + "/json/new?about:blank", { method: "PUT" });
  const t = await r.json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res) => ws.addEventListener("open", res));
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    } else if (msg.method) {
      listeners.forEach((fn) => fn(msg));
    }
  });
  function send(method, params) {
    id += 1;
    const my = id;
    ws.send(JSON.stringify({ id: my, method, params: params || {} }));
    return new Promise((res) => pending.set(my, res));
  }
  return { send, on: (fn) => listeners.push(fn), close: () => ws.close() };
}

async function evalJs(c, expr) {
  const r = await c.send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result && r.result.exceptionDetails) {
    console.log("JS error:", JSON.stringify(r.result.exceptionDetails).slice(0, 300));
  }
  return r.result && r.result.result ? r.result.result.value : null;
}

async function smoothScrollTo(c, targetExpr, ms) {
  await evalJs(c, `new Promise((res)=>{const y0=scrollY; const y1=(${targetExpr}); const t0=performance.now(); function f(now){const t=Math.min(1,(now-t0)/${ms}); const e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2; scrollTo(0,y0+(y1-y0)*e); if(t<1) requestAnimationFrame(f); else res(1);} requestAnimationFrame(f);})`);
}

async function mouseAt(c, x, y, click) {
  for (let i = 0; i < 6; i++) {
    await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x - 30 + i * 6, y: y - 10 + i * 2 });
    await sleep(40);
  }
  await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  await sleep(250);
  if (click) {
    await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
    await sleep(60);
    await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
  }
}

async function record(c, name, script) {
  const dir = join(WORK, "frames_" + name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const frames = [];
  let recording = true;
  c.on(async (msg) => {
    if (msg.method !== "Page.screencastFrame") return;
    const p = msg.params;
    c.send("Page.screencastFrameAck", { sessionId: p.sessionId });
    if (!recording) return;
    const file = join(dir, String(frames.length).padStart(5, "0") + ".jpg");
    writeFileSync(file, Buffer.from(p.data, "base64"));
    frames.push({ file, t: p.metadata.timestamp });
  });
  await c.send("Page.startScreencast", { format: "jpeg", quality: 88, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  const tStart = Date.now() / 1000;
  await script();
  const tEnd = Date.now() / 1000;
  recording = false;
  await c.send("Page.stopScreencast");
  await sleep(200);
  if (frames.length < 2) throw new Error("no frames for " + name);
  const lines = [];
  for (let i = 0; i < frames.length; i++) {
    let next = tEnd;
    if (i + 1 < frames.length) next = frames[i + 1].t;
    let d = Math.max(0.02, next - frames[i].t);
    if (i === 0) d = d + Math.max(0, frames[0].t - tStart);
    lines.push("file '" + frames[i].file + "'", "duration " + d.toFixed(4));
  }
  lines.push("file '" + frames[frames.length - 1].file + "'");
  const list = join(dir, "list.txt");
  writeFileSync(list, lines.join("\n"));
  const vf = "scale=1000:800:flags=lanczos,fps=25,format=yuv420p";
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-vf", vf, "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-movflags", "+faststart", "-an", join(OUT, name + ".mp4")]);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", join(OUT, name + ".mp4"), "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "38", "-row-mt", "1", "-an", join(OUT, name + ".webm")]);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-sseof", "-0.6", "-i", join(OUT, name + ".mp4"), "-frames:v", "1", "-q:v", "3", join(OUT, name + ".jpg")]);
  console.log(name, frames.length, "frames,", (tEnd - tStart).toFixed(1), "s");
}

async function open(c, path, wait) {
  await c.send("Page.navigate", { url: BASE + path });
  await sleep(wait);
}

const proc = await launch();
let c;
try {
  c = await connect();
  await c.send("Page.enable");
  await c.send("Runtime.enable");
  await c.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await c.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });

  if (!ONLY || ONLY === "pass") {
    await open(c, "/", 9000);
    await evalJs(c, "document.documentElement.style.scrollSnapType='none'; 1");
    await smoothScrollTo(c, "document.getElementById('satellites').getBoundingClientRect().top+scrollY+40", 10);
    await sleep(2500);
    const pinAt = (f) => "(()=>{const r=document.getElementById('satpin').getBoundingClientRect(); return r.top+scrollY+(r.height-innerHeight)*" + f + "})()";
    await record(c, "pass", async () => {
      await sleep(700);
      await smoothScrollTo(c, pinAt(0.25), 3400);
      await sleep(2600);
      await smoothScrollTo(c, pinAt(0.8), 3800);
      await sleep(2800);
    });
  }

  if (!ONLY || ONLY === "pick") {
    await open(c, "/explore", 9000);
    await record(c, "pick", async () => {
      await sleep(1200);
      const box = await evalJs(c, "(()=>{const r=document.querySelector('.searchbox input').getBoundingClientRect(); return [r.left+r.width/2, r.top+r.height/2]})()");
      await mouseAt(c, box[0], box[1], true);
      await sleep(500);
      for (const ch of "Punjab") {
        await c.send("Input.insertText", { text: ch });
        await sleep(140);
      }
      await sleep(900);
      await c.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
      await c.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
      await sleep(2600);
      await evalJs(c, "(()=>{const b=[...document.querySelectorAll('.timestrip .seg button')].find(x=>x.textContent==='Day'); b && b.click(); return 1})()");
      await sleep(900);
      await evalJs(c, "(()=>{const b=[...document.querySelectorAll('.timestrip button')].find(x=>x.textContent.includes('Play')); b && b.click(); return 1})()");
      await sleep(4800);
    });
  }

  if (!ONLY || ONLY === "harm") {
    await open(c, "/calendar/world", 5000);
    await record(c, "harm", async () => {
      await sleep(1600);
      await evalJs(c, "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim().startsWith('Harmonised')); b && b.click(); return !!b})()");
      await sleep(2600);
      await evalJs(c, "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim().startsWith('Raw')); b && b.click(); return !!b})()");
      await sleep(2000);
      await evalJs(c, "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim().startsWith('Harmonised')); b && b.click(); return !!b})()");
      await sleep(2600);
    });
  }

  if (!ONLY || ONLY === "answer") {
    await open(c, "/explore", 9000);
    const box = await evalJs(c, "(()=>{const r=document.querySelector('.searchbox input').getBoundingClientRect(); return [r.left+r.width/2, r.top+r.height/2]})()");
    await mouseAt(c, box[0], box[1], true);
    await c.send("Input.insertText", { text: "Punjab" });
    await sleep(400);
    await c.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
    await c.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
    await sleep(3000);
    await record(c, "answer", async () => {
      await sleep(900);
      const g = await evalJs(c, "(()=>{const r=document.querySelector('.globe-host').getBoundingClientRect(); return [r.left+r.width/2, r.top+r.height/2]})()");
      await mouseAt(c, g[0], g[1] - 10, true);
      await sleep(3200);
      const ex = await evalJs(c, "(()=>{const b=[...document.querySelectorAll('.insp-actions button')].find(x=>x.textContent.includes('Open calendar')); if(!b) return null; const r=b.getBoundingClientRect(); return [r.left+r.width/2, r.top+r.height/2]})()");
      if (ex) {
        await mouseAt(c, ex[0], ex[1], false);
      }
      await sleep(2400);
    });
  }
} finally {
  if (c) c.close();
  proc.kill("SIGTERM");
}
