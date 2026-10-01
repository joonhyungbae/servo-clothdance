/*
 시작하는 자리. 타격 → 몸짓 → 천 → 화면 · 모터 를 한 프레임마다 잇는다.

 주소 뒤에 붙여 쓰는 것
   ?sim          마이크 없이 가짜 타격으로 시작
   ?display      조절판 없이 무대만 (큰 화면에 띄울 때)
   ?offline=10   10초를 녹화해 서버에 보내고 끝낸다 (./start.sh --offline 10 이 쓴다)

 소리를 듣는 일은 hear-worklet.js 가 소리 담당 스레드에서 한다. 창이 가려져 그림이 멈춰도
 타격을 놓치지 않는다. 여기서는 들어온 사건을 몸짓으로 넘기고, 각도를 모터로 내보낸다.
*/

import { PARAMS, ARM_REST, ARM_HIGH } from "./settings.js";
import { MicListen, SimListen } from "./listen.js";
import { Move } from "./move.js";
import { Cloth } from "./cloth.js";
import { Stage } from "./stage.js";

const $ = (id) => document.getElementById(id);
const url = new URLSearchParams(location.search);

// 조절판에서 바꾼 값은 이 브라우저에 남긴다. settings.js 의 처음 값이 바뀌었으면 남은 값을 버린다.
const STORE = "clothdance.params.v1";
const DEFAULTS = Object.fromEntries(PARAMS.map((d) => [d.key, d.value]));
const p = { ...DEFAULTS };
try {
  const saved = JSON.parse(localStorage.getItem(STORE) || "null");
  if (saved && JSON.stringify(saved.defaults) === JSON.stringify(DEFAULTS)) Object.assign(p, saved.values);
} catch {}
const save = () => {
  try { localStorage.setItem(STORE, JSON.stringify({ defaults: DEFAULTS, values: p })); } catch {}
};

/* ---------- 조절판 ---------- */

function buildPanel() {
  const box = $("params");
  box.innerHTML = "";
  for (const d of PARAMS) {
    const row = document.createElement("label");
    row.className = "param";
    const input = document.createElement("input");
    if (d.type === "check") {
      input.type = "checkbox";
      input.checked = !!p[d.key];
    } else {
      input.type = "range";
      Object.assign(input, { min: d.min, max: d.max, step: d.step });
      input.value = p[d.key];
    }
    const out = document.createElement("output");
    const show = () => (out.textContent = d.type ? "" : Number(p[d.key]).toFixed(d.step < 1 ? 2 : 0));
    input.addEventListener("input", () => {
      p[d.key] = d.type === "check" ? input.checked : Number(input.value);
      show();
      save();
      listener?.tune(p);
    });
    show();
    row.append(Object.assign(document.createElement("span"), { textContent: d.label }), input, out);
    box.append(row);
  }
}

/* ---------- 타격 듣기 ---------- */

const move = new Move();
let listener = null;
let lastHit = 0;

function onHit(e) {
  lastHit = e.strength;
  move.hit(e, p);
}

async function useSource(kind) {
  listener?.stop();
  listener = kind === "sim" ? new SimListen({ onHit }) : new MicListen({ onHit });
  $("status").textContent = "여는 중";
  try {
    await listener.start();
    listener.tune(p);
    $("status").textContent = `${listener.source}${listener.note ? ` · ${listener.note}` : ""}`;
    $("listen").textContent = "듣는 중";
    $("listen").classList.add("on");
  } catch (e) {
    $("status").textContent = `열지 못했습니다: ${e.message || e}. 「가짜 타격」으로 바꿔 몸짓부터 볼 수 있습니다`;
    listener = new SimListen({ onHit });
  }
}

$("source").addEventListener("change", (e) => useSource(e.target.value));
$("listen").addEventListener("click", () => useSource($("source").value));
// 악기가 없을 때 손으로 쳐 본다. 스페이스도 같은 일을 한다
const tap = () => onHit({ t: performance.now() / 1000, strength: 0.35 + Math.random() * 0.5 });
$("tap").addEventListener("click", tap);

/* ---------- 모터로 내보내기 ---------- */

let sending = false;
let lastSent = 0;
let sendOff = false;      // 받는 서버가 없으면 한 번 해 보고 그만둔다
let sendNote = "";

async function send(s) {
  if (sendOff || !p.sendHz || sending) return;
  const now = performance.now();
  if (now - lastSent < 1000 / p.sendHz) return;
  lastSent = now;
  sending = true;
  try {
    const res = await fetch("move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ left: s.leftDeg, right: s.rightDeg, body: s.bodyDeg, energy: s.energy }),
    });
    if (!res.ok) throw new Error(res.status);
  } catch {
    // 설치 없이 보는 주소(GitHub Pages)로 열었을 때가 대부분이다. 화면은 그대로 돈다.
    sendOff = true;
    sendNote = "모터로 내보내기 꺼짐 (./start.sh 로 열면 아두이노로 나갑니다)";
  } finally {
    sending = false;
  }
}

/* ---------- 기록 ---------- */

let recorder = null;
function stamp() {
  const d = new Date();
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}`;
}
function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
function toggleRecord() {
  if (recorder) { recorder.stop(); return; }
  const type = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find((t) =>
    window.MediaRecorder?.isTypeSupported?.(t)
  );
  if (!type) { $("status").textContent = "이 브라우저는 화면 녹화를 지원하지 않습니다"; return; }
  const chunks = [];
  recorder = new MediaRecorder($("out").captureStream(30), { mimeType: type });
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  recorder.onstop = () => {
    download(new Blob(chunks, { type }), `clothdance-${stamp()}.${type.includes("mp4") ? "mp4" : "webm"}`);
    recorder = null;
    $("rec").textContent = "녹화 시작";
    $("rec").classList.remove("on");
  };
  recorder.start(1000);
  $("rec").textContent = "녹화 멈추고 저장";
  $("rec").classList.add("on");
}
$("rec").addEventListener("click", toggleRecord);
$("snap").addEventListener("click", () => $("out").toBlob((b) => download(b, `clothdance-${stamp()}.png`)));
$("only").addEventListener("click", () => document.body.classList.toggle("display"));
$("reset").addEventListener("click", () => {
  for (const d of PARAMS) p[d.key] = d.value;
  save();
  buildPanel();
  listener?.tune(p);
});
addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
  const k = e.key.toLowerCase();
  if (e.code === "Space") { e.preventDefault(); tap(); }
  if (k === "h") document.body.classList.toggle("display");
  if (k === "f") document.fullscreenElement ? document.exitFullscreen() : $("stage").requestFullscreen?.();
  if (k === "r") toggleRecord();
});

/* 전시 중에 화면이 저절로 꺼지면 안 된다. 되는 브라우저에서만 막는다. */
let wake = null;
async function keepAwake() {
  try {
    if (!wake && navigator.wakeLock) {
      wake = await navigator.wakeLock.request("screen");
      wake.addEventListener("release", () => (wake = null));
    }
  } catch {}
}
addEventListener("pointerdown", keepAwake);
document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && keepAwake());

/* ---------- 한 프레임 ---------- */

const stage = new Stage($("out"));
const cloth = new Cloth(stage.layout());
let last = performance.now();
let fps = 60;

function meter(id, v, text) {
  $(`m-${id}`).style.width = `${Math.min(1, Math.abs(v)) * 100}%`;
  $(`v-${id}`).textContent = text;
}

function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  fps = fps * 0.9 + (1 / Math.max(0.001, dt)) * 0.1;

  if (listener instanceof SimListen) listener.read(now);
  const s = move.step(dt, p);
  const scale = stage.layout();
  if (Math.abs(scale - cloth.scale) > 1) cloth.set(scale);
  const j = stage.joints(s);
  cloth.update(dt, j, p);
  stage.draw(s, j, cloth, p);
  send(s);

  if (!document.body.classList.contains("display")) {
    meter("level", listener?.level || 0, (listener?.level || 0).toFixed(2));
    meter("hit", lastHit, lastHit.toFixed(2));
    meter("energy", s.energy, s.energy.toFixed(2));
    const span = ARM_HIGH - ARM_REST;
    meter("left", (s.leftDeg - ARM_REST) / span, `${Math.round(s.leftDeg)}°`);
    meter("right", (s.rightDeg - ARM_REST) / span, `${Math.round(s.rightDeg)}°`);
    meter("body", Math.abs(s.body), `${Math.round(s.bodyDeg)}°`);
    $("hits").textContent = `들은 타격 ${s.hits}번`;
    if (sendNote) $("wire").textContent = sendNote;
    $("fps").textContent = `${Math.round(fps)} fps`;
  }
  requestAnimationFrame(loop);
}

/* ---------- 시작 ---------- */

buildPanel();
if (url.has("display")) document.body.classList.add("display");
if (url.has("sim")) {
  $("source").value = "sim";
  useSource("sim");
}
requestAnimationFrame(loop);

/* ./start.sh --offline N. 장비 없이 N초를 녹화해 serve.py 에 보낸다. 검증용. */
const offline = Number(url.get("offline") || 0);
if (offline > 0) {
  setTimeout(() => {
    const type = ["video/mp4;codecs=avc1", "video/mp4", "video/webm"].find((t) => window.MediaRecorder?.isTypeSupported?.(t));
    if (!type) { $("status").textContent = "이 브라우저는 녹화를 지원하지 않습니다"; return; }
    const chunks = [];
    const rec = new MediaRecorder($("out").captureStream(30), { mimeType: type });
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      const ext = type.includes("mp4") ? "mp4" : "webm";
      try {
        await fetch(`save?ext=${ext}`, { method: "POST", body: new Blob(chunks, { type }) });
        $("status").textContent = `out.${ext} 로 적었습니다. 이 창은 닫아도 됩니다`;
      } catch {
        download(new Blob(chunks, { type }), `out.${ext}`);
      }
    };
    $("status").textContent = `${offline}초 녹화 중`;
    rec.start(1000);
    setTimeout(() => rec.stop(), offline * 1000);
  }, 1500);
}

window.clothdance = { p, move, get listener() { return listener; } };
