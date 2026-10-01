/*
 입력. 관객이 악기를 두드린 순간과 세기.

 내보내는 것은 사건 하나다.
   onHit({ t, strength })   t 는 들린 시각(초), strength 는 0~1 의 세기

 듣는 길은 둘이다. 마이크로 진짜 타격을 듣거나(MicListen), 장비 없이 가짜로 친다(SimListen).
 어느 쪽이든 같은 사건을 내보내므로 뒤쪽 코드는 그대로 돈다. 악기와 센서가 손에 들어오기
 전에도 몸짓과 천의 규칙을 먼저 만들 수 있게 하려는 것이다.

 나중에 접촉 센서나 피에조를 쓰게 되면 이 파일에 한 가지를 더 붙이면 된다.
 아두이노에서 온 값을 읽어 같은 모양의 사건을 내보내면 move.js 는 고치지 않아도 된다.
*/

import { FLOOR_UP_SEC, FLOOR_DOWN_SEC, HIT_DB } from "./settings.js";

const WORKLET = new URL("hear-worklet.js", document.baseURI).href;

/* 마이크로 듣는다. 분석은 소리 담당 스레드(hear-worklet.js)가 한다. */
export class MicListen {
  constructor({ onHit = () => {}, deviceId = null } = {}) {
    this.onHit = onHit;
    this.deviceId = deviceId;
    this.source = "마이크";
    this.level = 0;
    this.floor = 0;
    this.note = "";
  }

  async start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("이 브라우저에서는 마이크를 열 수 없습니다. 주소가 localhost 이거나 https 여야 합니다");
    }
    // 타악기는 갑자기 커지는 소리다. 브라우저가 소리를 고르게 다듬으면 그 봉우리가 깎인다.
    const audio = {
      echoCancellation: false, noiseSuppression: false, autoGainControl: false,
      ...(this.deviceId ? { deviceId: { exact: this.deviceId } } : {}),
    };
    this.stream = await navigator.mediaDevices.getUserMedia({ audio, video: false });
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    await this.ctx.audioWorklet.addModule(WORKLET);
    this.node = new AudioWorkletNode(this.ctx, "hear", {
      numberOfOutputs: 0,
      processorOptions: { floorUp: FLOOR_UP_SEC, floorDown: FLOOR_DOWN_SEC, range: HIT_DB },
    });
    this.node.port.onmessage = (e) => {
      const d = e.data;
      if (d.hit) this.onHit({ t: d.t, strength: d.strength });
      else {
        this.level = d.level;
        this.floor = d.floor;
      }
    };
    this.ctx.createMediaStreamSource(this.stream).connect(this.node);
    await this.ctx.resume();
    const track = this.stream.getAudioTracks()[0];
    this.source = `마이크: ${track?.label || "기본"}`;
    this.note = `${Math.round(this.ctx.sampleRate / 1000)}kHz`;
  }

  /* 조절판에서 바꾼 값을 듣는 쪽에 넘긴다 */
  tune(p) {
    this.node?.port.postMessage({ threshold: p.hitThreshold, refractory: p.refractory, range: p.hitRange });
  }

  stop() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close();
  }
}

/* 가짜 타격. 악기도 마이크도 없이 몸짓과 천을 볼 때 쓴다. */
export class SimListen {
  constructor({ onHit = () => {} } = {}) {
    this.onHit = onHit;
    this.source = "가짜 타격";
    this.note = "악기 없이 혼자 두드리는 중";
    this.level = 0;
    this.floor = 0;
    this.next = 0;
  }

  async start() {}
  stop() { this.timer && clearTimeout(this.timer); }
  tune() {}

  /* 사람이 치는 것처럼 간격과 세기를 들쭉날쭉하게 둔다. 고르게 치면 여운을 볼 수 없다. */
  read(now) {
    const t = now / 1000;
    this.level = Math.max(0, this.level - 0.04);
    if (t < this.next) return;
    if (this.next > 0) {
      const strength = 0.25 + Math.random() * 0.75;
      this.level = strength;
      this.onHit({ t, strength });
    }
    this.next = t + 0.35 + Math.random() * 1.5;
  }
}
