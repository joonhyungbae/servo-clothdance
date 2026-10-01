/*
 소리를 듣는 자리. 브라우저의 소리 담당 스레드에서 돈다.

 화면 그리기와 떨어져 있어야 한다. 창이 가려져 그림이 멈춰도 타격은 놓치지 않는다.
 여기서는 두 가지만 한다. 짧게 끊어 소리의 크기를 재고, 바닥 소음보다 갑자기 커지면
 「타격」 하나를 알린다. 무엇을 할지는 main 쪽(move.js)이 정한다.

 바닥 소음을 따라 문턱이 움직인다. 전시장마다 조용한 정도가 다르고, 같은 방에서도
 사람이 많아지면 바닥이 올라가기 때문이다. 고정된 문턱을 두면 어느 방에서는 안 잡히고
 어느 방에서는 숨소리에도 터진다.
*/

class Hear extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const o = options.processorOptions || {};
    this.floorUp = o.floorUp ?? 3.0;
    this.floorDown = o.floorDown ?? 0.25;
    this.range = o.range ?? 30;      // dB
    this.threshold = o.threshold ?? 4;
    this.refractory = o.refractory ?? 0.12;
    this.floor = 0.003;        // 바닥 소음. 첫 숨에 곧 제자리를 찾는다
    this.level = 0;
    this.lastHit = -1;
    this.peak = 0;             // 타격이 시작된 뒤의 가장 큰 소리
    this.rising = false;
    this.port.onmessage = (e) => Object.assign(this, e.data || {});
  }

  process(inputs) {
    const ch = inputs[0]?.[0];
    if (!ch) return true;

    let sum = 0;
    for (let i = 0; i < ch.length; i++) sum += ch[i] * ch[i];
    const rms = Math.sqrt(sum / ch.length);
    this.level = this.level * 0.7 + rms * 0.3;

    const dt = ch.length / sampleRate;
    // 바닥은 천천히 올라가고 빨리 내려온다. 북 소리가 바닥을 끌어올리면 다음 타격을 놓친다
    const sec = rms > this.floor ? this.floorUp : this.floorDown;
    this.floor += (rms - this.floor) * (1 - Math.exp(-dt / sec));
    this.floor = Math.max(1e-5, this.floor);

    const ratio = rms / this.floor;
    const now = currentTime;

    if (this.rising) {
      this.peak = Math.max(this.peak, ratio);
      // 소리가 꺾이면 그 타격의 세기를 정해 보낸다. 봉우리를 봐야 세기가 맞는다
      if (ratio < this.peak * 0.6) {
        // 세기는 dB 로 잰다. 살살 친 것과 세게 친 것의 소리 크기는 몇 배가 아니라 몇십 배 차이다
        const over = 20 * Math.log10(this.peak / this.threshold);
        const strength = Math.min(1, Math.max(0.05, over / this.range));
        this.port.postMessage({ hit: true, t: now, strength });
        this.rising = false;
        this.peak = 0;
      }
    } else if (ratio > this.threshold && now - this.lastHit > this.refractory) {
      this.rising = true;
      this.peak = ratio;
      this.lastHit = now;
    }

    // 미터용. 자주 보내면 메인 쪽이 밀리므로 30Hz 쯤으로 줄인다
    if (!this.lastSend || now - this.lastSend > 0.033) {
      this.lastSend = now;
      const db = 20 * Math.log10(Math.max(1, ratio));
      this.port.postMessage({ level: Math.min(1, db / this.range), floor: this.floor });
    }
    return true;
  }
}

registerProcessor("hear", Hear);
