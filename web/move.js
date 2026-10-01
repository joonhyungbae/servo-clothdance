/*
 몸짓. **이 파일이 작가가 고칠 첫 번째 자리다.** (두 번째는 cloth.js)

 타격 하나가 꼭두의 어떤 몸짓이 되는지를 정한다. 여기만 고치면 같은 장치로 다른 춤이 나온다.

 받는 것   hit({ strength })  0~1 의 세기
 내보내는 것
   left, right   두 팔이 올라간 정도 0~1
   body          몸통이 돌아간 정도 -1 ~ 1
   leftDeg, rightDeg, bodyDeg   모터가 그대로 쓰는 각도(도)

 지금의 규칙
   한 번 치면 한쪽 팔이 올라갔다가 천천히 내려온다. 올라가는 시간은 짧고 내려오는 시간은 길다
   세게 치면 두 팔이 함께 펼쳐진다. 동래학춤의 일자사위를 생각하고 둔 자리다
   내려오기 전에 또 치면 그 위에 얹혀서 더 올라간다. 몰아치면 점점 높아진다
   치지 않으면 숨만 남는다. 완전히 멈춰 서지 않게 하려는 것이다

 바꿔 볼 것
   팔을 번갈아 쓰지 않고 소리의 높낮이로 어느 팔인지 고르기 (listen.js 에서 높낮이를 같이 보낸다)
   세 번째 모터를 몸통이 아니라 고개에 쓰기
   빠르게 이어 친 횟수를 세어, 몇 번을 넘으면 다른 몸짓으로 넘어가기
*/

import { ARM_REST, ARM_HIGH, BODY_TURN, BOTH_ARMS, BODY_LAG } from "./settings.js";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export class Move {
  constructor() {
    this.left = 0;
    this.right = 0;
    this.goalL = 0;      // 팔이 가려고 하는 자리. 치면 올라가고 저절로 내려온다
    this.goalR = 0;
    this.body = 0;
    this.side = 1;       // 번갈아 쓰려고 어느 팔 차례인지 기억한다
    this.energy = 0;     // 지금 얼마나 몰아치고 있나. 미터와 조명에 쓴다
    this.hits = 0;
    this.lastHit = 0;
    this.phase = 0;
  }

  /* 타격 하나가 들어왔을 때 */
  hit({ strength = 0.5 } = {}, p) {
    const lift = strength * p.swing;
    if (strength >= BOTH_ARMS) {
      // 센 타격은 두 팔로 받는다. 한쪽만 올리면 큰 소리가 작아 보인다
      this.goalL = clamp(this.goalL + lift, 0, 1.2);
      this.goalR = clamp(this.goalR + lift, 0, 1.2);
    } else {
      if (this.side > 0) this.goalL = clamp(this.goalL + lift, 0, 1.2);
      else this.goalR = clamp(this.goalR + lift, 0, 1.2);
      this.side = -this.side;
    }
    this.energy = clamp(this.energy + strength * 0.6, 0, 1);
    this.hits++;
    this.lastHit = performance.now() / 1000;
  }

  /* 한 프레임. dt 는 지난 시간(초) */
  step(dt, p) {
    this.phase += dt;

    // 가려고 하는 자리가 저절로 내려온다. 이 시간이 길수록 여운이 길다
    const decay = Math.exp(-dt / Math.max(0.05, p.fall));
    this.goalL *= decay;
    this.goalR *= decay;

    // 팔이 그 자리를 따라간다. 올라갈 때는 빠르고 내려올 때는 내려오는 속도 그대로다
    const follow = (now, goal) => {
      const k = goal > now ? 1 - Math.exp(-dt / Math.max(0.02, p.rise)) : 1 - Math.exp(-dt / 0.25);
      return now + (goal - now) * k;
    };
    this.left = follow(this.left, this.goalL);
    this.right = follow(this.right, this.goalR);

    // 숨. 두 팔이 아주 조금 오르내린다. 멈춰 선 인형처럼 보이지 않게 한다
    const breath = p.breath * 0.04 * Math.sin(this.phase * 1.1);
    const idle = p.breath * 0.02 * Math.sin(this.phase * 0.37);

    // 몸통은 올라간 팔 쪽으로 돈다. 팔보다 늦게 따라가야 몸이 끌려가는 것처럼 보인다
    const want = clamp(this.right - this.left, -1, 1);
    this.body += (want - this.body) * (1 - Math.exp(-dt / BODY_LAG));
    this.energy = Math.max(0, this.energy - dt * 0.5);

    const L = clamp(this.left + breath, 0, 1.2);
    const R = clamp(this.right + breath, 0, 1.2);
    const B = clamp(this.body + idle, -1, 1);
    const deg = (v) => ARM_REST + (ARM_HIGH - ARM_REST) * clamp(v, 0, 1);
    return {
      left: L, right: R, body: B, energy: this.energy, hits: this.hits,
      leftDeg: deg(L), rightDeg: deg(R), bodyDeg: 90 + BODY_TURN * B,
    };
  }
}
