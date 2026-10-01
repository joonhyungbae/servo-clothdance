/*
 천. **이 파일이 작가가 고칠 두 번째 자리다.** (첫 번째는 move.js)

 모터는 팔만 움직인다. 흰 소매와 도포 자락이 그 뒤를 늦게 따라오며 펼쳐지고 내려앉는다.
 그 늦음이 이 작품에서 눈에 남는 부분이고, 모터를 늘리지 않고도 움직임을 풍부하게 만드는 길이다.

 푸는 방법은 베를레(Verlet)다. 마디마다 「지금 자리」와 「조금 전 자리」만 들고 있으면
 속도는 그 둘의 차이로 저절로 생긴다. 당겨 맞추기를 몇 번 되풀이하면 천처럼 보인다.
 식이 짧아서 읽기 쉽고, 마디 수를 늘려도 느려지지 않는다.

 바꿔 볼 것
   CLOTH_NODES 를 늘리면 더 부드럽고 느리게 흐른다
   GRAVITY 와 DAMP 로 천의 무게와 끈적임이 달라진다. 명주와 무명의 차이가 여기서 난다
   wind() 에 선풍기를 흉내 낸 바람을 넣어 본다. 실제로도 작은 팬 하나가 도포자락을 살린다
*/

import { CLOTH_NODES, CLOTH_STEPS, GRAVITY, DAMP, HEM_NODES } from "./settings.js";

class Rope {
  constructor(n, len) {
    this.len = len;                          // 마디 하나의 길이
    this.p = Array.from({ length: n }, (_, i) => ({ x: 0, y: i * len, px: 0, py: i * len }));
  }

  /* 첫 마디를 손이나 허리에 붙여 두고 나머지를 푼다 */
  step(dt, anchor, grav, damp, wind) {
    const a = this.p[0];
    a.x = anchor.x;
    a.y = anchor.y;
    a.px = anchor.x;
    a.py = anchor.y;

    for (let i = 1; i < this.p.length; i++) {
      const q = this.p[i];
      const vx = (q.x - q.px) * damp;
      const vy = (q.y - q.py) * damp;
      q.px = q.x;
      q.py = q.y;
      // 끝으로 갈수록 바람을 더 받는다. 소맷부리가 가장 크게 돈다
      const t = i / (this.p.length - 1);
      q.x += vx + wind.x * t * dt;
      q.y += vy + (grav + wind.y * t) * dt * dt;
    }

    // 마디 사이를 제 길이로 당겨 맞춘다. 여러 번 할수록 천이 덜 늘어난다
    for (let s = 0; s < CLOTH_STEPS; s++) {
      for (let i = 0; i < this.p.length - 1; i++) {
        const a1 = this.p[i], b1 = this.p[i + 1];
        const dx = b1.x - a1.x, dy = b1.y - a1.y;
        const d = Math.hypot(dx, dy) || 1e-6;
        const push = (d - this.len) / d / 2;
        const mx = dx * push, my = dy * push;
        if (i > 0) { a1.x += mx; a1.y += my; }
        b1.x -= mx;
        b1.y -= my;
      }
      this.p[0].x = anchor.x;
      this.p[0].y = anchor.y;
    }
  }
}

export class Cloth {
  /* scale 은 꼭두 한 사람의 키(픽셀)다. 화면 크기가 달라져도 천의 비례가 같게 한다 */
  constructor(scale = 300) {
    this.set(scale);
  }

  set(scale) {
    this.scale = scale;
    const sleeve = (scale * 0.26) / (CLOTH_NODES - 1);
    const hem = (scale * 0.11) / (HEM_NODES - 1);
    this.sleeveL = new Rope(CLOTH_NODES, sleeve);
    this.sleeveR = new Rope(CLOTH_NODES, sleeve);
    this.hemL = new Rope(HEM_NODES, hem);
    this.hemR = new Rope(HEM_NODES, hem);
  }

  /* anchors: handL, handR, skirtL, skirtR (화면 좌표) */
  update(dt, anchors, p) {
    const air = p.clothAir;
    const grav = GRAVITY * (1 - air * 0.6) * (this.scale / 300);
    const damp = DAMP + air * 0.014;             // 가벼울수록 오래 흔들린다
    const wind = this.wind(p);
    const sleeveLen = (this.scale * 0.26 * p.sleeve) / (CLOTH_NODES - 1);
    this.sleeveL.len = this.sleeveR.len = sleeveLen;

    const d = Math.min(0.033, dt);               // 큰 간격이 들어오면 천이 터진다
    this.sleeveL.step(d, anchors.handL, grav, damp, wind);
    this.sleeveR.step(d, anchors.handR, grav, damp, wind);
    const low = { x: wind.x * 0.35, y: wind.y };   // 바닥 가까운 자락은 바람을 덜 받는다
    this.hemL.step(d, anchors.skirtL, grav, damp, low);
    this.hemR.step(d, anchors.skirtR, grav, damp, low);
  }

  /* 바람. 지금은 아주 약하게만 분다. 전시장에 팬을 둔다면 이 값을 키운다 */
  wind(p) {
    const t = performance.now() / 1000;
    const sway = Math.sin(t * 0.7) + 0.4 * Math.sin(t * 1.9 + 1.2);
    return { x: sway * 60 * p.clothAir * this.scale * 0.003, y: 0 };
  }

  /* 소매 두 폭. 마디의 자리와 그 자리에서의 천 너비 */
  ribbons() {
    const band = (rope, w0, w1) =>
      rope.p.map((q, i) => {
        const t = i / (rope.p.length - 1);
        return { x: q.x, y: q.y, w: this.scale * (w0 + (w1 - w0) * t) };
      });
    return [band(this.sleeveL, 0.055, 0.1), band(this.sleeveR, 0.055, 0.1)];
  }

  /* 도포 아랫단이 지금 가 있는 자리. 몸이 돌면 늦게 따라와 치맛자락처럼 쏠린다.
     따로 그리지 않고 도포의 아래 두 귀퉁이로 쓴다. 한 벌의 옷으로 보이게 하려는 것이다. */
  skirt() {
    const last = (rope) => rope.p[rope.p.length - 1];
    return { left: last(this.hemL), right: last(this.hemR) };
  }
}
