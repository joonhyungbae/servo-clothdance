/*
 화면. 꼭두와 천을 그린다.

 실제 작품은 나무와 천과 모터로 만든다. 이 화면은 그 전에 몸짓과 천의 규칙을 먼저
 눈으로 보려고 둔 자리다. 모터 각도와 천의 늦음이 실제와 같은 숫자로 돌기 때문에,
 여기서 좋아 보이는 값을 그대로 아두이노로 보내면 된다.

 그리는 순서는 뒤에서 앞으로다. 바닥 → 도포 자락 → 몸통 → 갓 → 팔 → 소매.
 흰 천에 빛이 모이고 뒤는 어둡다. 전시장 조명을 그렇게 잡기로 한 것과 같은 그림이다.
*/

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
  }

  /* 화면 크기에 맞춰 꼭두 한 사람의 키를 정한다 */
  layout() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(320, Math.round(r.width)), h = Math.max(240, Math.round(r.height));
    if (this.canvas.width !== w * dpr || this.canvas.height !== h * dpr) {
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w;
    this.h = h;
    this.scale = Math.min(h * 0.62, w * 0.42);     // 꼭두의 키
    this.cx = w / 2;
    this.baseY = h * 0.86;
    return this.scale;
  }

  /* 관절 자리. 천이 붙는 자리도 여기서 나온다 */
  joints(s) {
    const S = this.scale, cx = this.cx, base = this.baseY;
    const turn = s.body * 0.5;                      // 몸통이 돌면 어깨가 좁아 보인다
    const half = S * 0.125 * Math.cos(turn);
    const sy = base - S * 0.74;
    const hy = base - S * 0.5;
    const lean = s.body * S * 0.02;                 // 돌아간 쪽으로 몸이 조금 쏠린다
    const arm = S * 0.3;
    const hand = (sx, deg, dir) => {
      const a = (deg * Math.PI) / 180;
      return { x: sx + dir * arm * Math.sin(a), y: sy + arm * Math.cos(a) };
    };
    const shoulderL = { x: cx - half + lean, y: sy };
    const shoulderR = { x: cx + half + lean, y: sy };
    return {
      shoulderL, shoulderR,
      hipL: { x: cx - S * 0.075 * Math.cos(turn) + lean * 0.5, y: hy },
      hipR: { x: cx + S * 0.075 * Math.cos(turn) + lean * 0.5, y: hy },
      // 도포 아랫단의 두 귀퉁이. 여기에 자락이 매달려 흔들린다
      skirtL: { x: cx - S * 0.13 * Math.cos(turn) + lean * 0.3, y: base - S * 0.1 },
      skirtR: { x: cx + S * 0.13 * Math.cos(turn) + lean * 0.3, y: base - S * 0.1 },
      handL: hand(shoulderL.x, s.leftDeg, -1),
      handR: hand(shoulderR.x, s.rightDeg, 1),
      head: { x: cx + lean * 1.4, y: base - S * 0.88 },
      foot: { x: cx, y: base },
    };
  }

  draw(s, j, cloth, p) {
    const c = this.ctx;
    const S = this.scale;

    // 바탕과 바닥. 뒤는 어둡게 두고 꼭두 발밑만 밝힌다
    const bg = c.createLinearGradient(0, 0, 0, this.h);
    bg.addColorStop(0, "#0b0c0d");
    bg.addColorStop(1, "#15171a");
    c.fillStyle = bg;
    c.fillRect(0, 0, this.w, this.h);
    const pool = c.createRadialGradient(this.cx, this.baseY, S * 0.05, this.cx, this.baseY, S * 0.9);
    pool.addColorStop(0, `rgba(255,243,220,${0.1 + s.energy * 0.1})`);
    pool.addColorStop(1, "rgba(255,243,220,0)");
    c.fillStyle = pool;
    c.fillRect(0, this.baseY - S * 0.9, this.w, S * 1.1);
    c.fillStyle = "rgba(0,0,0,0.45)";
    c.beginPath();
    c.ellipse(this.cx, this.baseY + S * 0.012, S * 0.17, S * 0.022, 0, 0, Math.PI * 2);
    c.fill();

    if (p.bones) return this.bones(s, j);

    const [sleeveL, sleeveR] = cloth.ribbons();
    this.body(j, S, cloth.skirt());
    this.arms(j, S);
    this.head(j, S);
    this.ribbon(sleeveL);
    this.ribbon(sleeveR);
  }

  /* 천 한 폭. 마디를 잇는 띠로 그리고 가장자리를 살짝 밝힌다 */
  ribbon(pts) {
    const c = this.ctx;
    const left = [], right = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const nx = -dy / d, ny = dx / d;              // 진행 방향의 수직
      const w = pts[i].w / 2;
      left.push({ x: pts[i].x + nx * w, y: pts[i].y + ny * w });
      right.push({ x: pts[i].x - nx * w, y: pts[i].y - ny * w });
    }
    c.beginPath();
    c.moveTo(left[0].x, left[0].y);
    for (const q of left) c.lineTo(q.x, q.y);
    for (let i = right.length - 1; i >= 0; i--) c.lineTo(right[i].x, right[i].y);
    c.closePath();
    const g = c.createLinearGradient(pts[0].x, pts[0].y, pts[pts.length - 1].x, pts[pts.length - 1].y);
    g.addColorStop(0, "rgba(246,244,238,0.96)");
    g.addColorStop(1, "rgba(214,214,206,0.82)");
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = "rgba(255,255,255,0.35)";
    c.lineWidth = 1;
    c.stroke();
  }

  /* 도포. 어깨에서 발목까지 한 겹으로 떨어진다. 아랫단은 천이 끌고 간 자리를 쓴다 */
  body(j, S, hem) {
    const c = this.ctx;
    const left = { x: hem.left.x, y: Math.max(hem.left.y, j.skirtL.y) };
    const right = { x: hem.right.x, y: Math.max(hem.right.y, j.skirtR.y) };
    const g = c.createLinearGradient(0, j.shoulderL.y, 0, left.y);
    g.addColorStop(0, "#f6f4ee");
    g.addColorStop(0.55, "#e7e5dd");
    g.addColorStop(1, "#c9c8c1");
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(j.shoulderL.x, j.shoulderL.y);
    c.lineTo(j.shoulderR.x, j.shoulderR.y);
    c.quadraticCurveTo(j.hipR.x + S * 0.04, j.hipR.y, right.x, right.y);
    // 아랫단은 곧은 선이 아니라 한 번 출렁이게 둔다
    c.quadraticCurveTo((left.x + right.x) / 2, Math.max(left.y, right.y) + S * 0.02, left.x, left.y);
    c.quadraticCurveTo(j.hipL.x - S * 0.04, j.hipL.y, j.shoulderL.x, j.shoulderL.y);
    c.closePath();
    c.fill();
    // 섶. 도포 앞자락이 겹치는 선. 깃에서 허리띠까지만 긋는다
    const midTop = (j.shoulderL.x + j.shoulderR.x) / 2;
    const midLow = (j.skirtL.x + j.skirtR.x) / 2;
    c.strokeStyle = "rgba(120,118,110,0.3)";
    c.lineWidth = Math.max(1, S * 0.004);
    c.beginPath();
    c.moveTo(midTop + S * 0.03, j.shoulderL.y + S * 0.03);
    c.lineTo(midLow + S * 0.015, j.hipL.y - S * 0.02);
    c.stroke();
    // 깃. 목 아래에 한 번 꺾이는 선
    c.beginPath();
    c.moveTo(midTop - S * 0.045, j.shoulderL.y + S * 0.005);
    c.lineTo(midTop + S * 0.01, j.shoulderL.y + S * 0.045);
    c.lineTo(midTop + S * 0.05, j.shoulderL.y + S * 0.005);
    c.stroke();
    // 허리띠
    c.fillStyle = "rgba(90,88,82,0.4)";
    c.fillRect(j.hipL.x - S * 0.012, j.hipL.y - S * 0.015, (j.hipR.x - j.hipL.x) + S * 0.024, S * 0.016);
  }

  head(j, S) {
    const c = this.ctx;
    c.fillStyle = "#efeee8";
    c.beginPath();
    c.arc(j.head.x, j.head.y, S * 0.055, 0, Math.PI * 2);
    c.fill();
    // 검정 갓. 챙과 통을 두 번에 그린다
    c.fillStyle = "#17181a";
    c.beginPath();
    c.ellipse(j.head.x, j.head.y - S * 0.035, S * 0.125, S * 0.022, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(j.head.x, j.head.y - S * 0.065, S * 0.045, S * 0.035, 0, 0, Math.PI * 2);
    c.fill();
  }

  /* 팔. 안쪽은 얇은 금속 막대이고 겉은 도포 소매다. 소매 쪽만 보이게 그린다 */
  arms(j, S) {
    const c = this.ctx;
    for (const [a, b] of [[j.shoulderL, j.handL], [j.shoulderR, j.handR]]) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const nx = -dy / d, ny = dx / d;
      const w0 = S * 0.042, w1 = S * 0.052;      // 어깨 쪽보다 소맷부리가 넓다
      c.beginPath();
      c.moveTo(a.x + nx * w0, a.y + ny * w0);
      c.lineTo(b.x + nx * w1, b.y + ny * w1);
      c.lineTo(b.x - nx * w1, b.y - ny * w1);
      c.lineTo(a.x - nx * w0, a.y - ny * w0);
      c.closePath();
      c.fillStyle = "#f1efe8";
      c.fill();
    }
  }

  /* 뼈대 보기. 모터 각도가 맞는지 확인할 때 쓴다 */
  bones(s, j) {
    const c = this.ctx;
    const S = this.scale;
    c.strokeStyle = "#8fe3d2";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(j.shoulderL.x, j.shoulderL.y);
    c.lineTo(j.shoulderR.x, j.shoulderR.y);
    c.moveTo(j.hipL.x, j.hipL.y);
    c.lineTo(j.hipR.x, j.hipR.y);
    c.moveTo((j.shoulderL.x + j.shoulderR.x) / 2, j.shoulderL.y);
    c.lineTo((j.hipL.x + j.hipR.x) / 2, j.hipL.y);
    c.lineTo(j.foot.x, j.foot.y);
    c.moveTo(j.shoulderL.x, j.shoulderL.y);
    c.lineTo(j.handL.x, j.handL.y);
    c.moveTo(j.shoulderR.x, j.shoulderR.y);
    c.lineTo(j.handR.x, j.handR.y);
    c.stroke();
    c.fillStyle = "#ffd27a";
    for (const q of [j.handL, j.handR, j.head]) {
      c.beginPath();
      c.arc(q.x, q.y, S * 0.018, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = "rgba(236,235,230,0.8)";
    c.font = `${Math.round(S * 0.05)}px system-ui, sans-serif`;
    c.textAlign = "center";
    c.fillText(`${Math.round(s.leftDeg)}°`, j.handL.x, j.handL.y - S * 0.05);
    c.fillText(`${Math.round(s.rightDeg)}°`, j.handR.x, j.handR.y - S * 0.05);
    c.fillText(`${Math.round(s.bodyDeg)}°`, j.foot.x, j.foot.y + S * 0.07);
  }
}
