/*
 만지는 숫자는 전부 여기 있다.

 화면 오른쪽 조절판의 값은 여기 적힌 것이 처음 값이다. 조절판에서 바꾼 값은 그 브라우저에
 남아 새로 고침해도 그대로다. 이 파일의 처음 값을 고치면 남아 있던 값을 버리고 다시 시작한다.

 타격 하나가 꼭두의 어떤 몸짓이 되는지(작품의 규칙)는 숫자가 아니라 연결이라서 move.js 에 있다.
*/

// ─── 조절판 ──────────────────────────────────────────────────────────────
export const PARAMS = [
  // 타격으로 볼 소리의 크기. 실제 문턱은 방의 바닥 소음을 따라 이보다 올라간다
  { key: "hitThreshold", label: "타격 문턱", min: 1.5, max: 12, step: 0.1, value: 4.0 },
  // 한 번 친 뒤 이 시간 안에 들어온 소리는 같은 타격의 울림으로 본다
  { key: "refractory", label: "다음 타격까지(초)", min: 0.04, max: 0.5, step: 0.01, value: 0.12 },
  // 문턱보다 이만큼(dB) 크게 치면 세기 1 이 된다. 좁히면 살짝만 세게 쳐도 크게 반응한다
  { key: "hitRange", label: "세기 범위(dB)", min: 8, max: 50, step: 1, value: 30 },
  // 팔이 올라가는 데 걸리는 시간. 짧을수록 타격에 붙어서 튄다
  { key: "rise", label: "팔 올라가는 시간(초)", min: 0.05, max: 0.8, step: 0.01, value: 0.18 },
  // 팔이 내려앉는 데 걸리는 시간. 이것이 길어야 도포자락에 여운이 남는다
  { key: "fall", label: "내려앉는 시간(초)", min: 0.3, max: 6, step: 0.1, value: 2.4 },
  // 세게 칠수록 팔이 얼마나 더 올라가나
  { key: "swing", label: "몸짓 크기", min: 0.2, max: 1.6, step: 0.05, value: 1.0 },
  // 가만히 있을 때의 숨. 0 이면 완전히 멈춰 선다
  { key: "breath", label: "숨(가만히 있을 때)", min: 0, max: 1, step: 0.05, value: 0.35 },
  // 천이 얼마나 가벼운가. 크면 오래 날리고 늦게 내려앉는다
  { key: "clothAir", label: "천의 가벼움", min: 0, max: 1, step: 0.02, value: 0.55 },
  // 소매 길이. 길수록 끝이 크게 돈다
  { key: "sleeve", label: "소매 길이", min: 0.4, max: 2, step: 0.05, value: 1.1 },
  // 모터로 내보내는 횟수. 아두이노가 이 값을 받는다
  { key: "sendHz", label: "모터로 보내는 횟수(초당)", min: 0, max: 60, step: 5, value: 30 },
  // 천 없이 뼈대만 본다. 모터 각도를 눈으로 확인할 때 쓴다
  { key: "bones", label: "뼈대 보기", type: "check", value: false },
];

// ─── 타격 듣기 (listen.js) ───────────────────────────────────────────────
export const FLOOR_UP_SEC = 3.0;    // 바닥 소음이 올라갈 때 따라가는 시간(초). 느려야 북소리를 바닥으로 삼지 않는다
export const FLOOR_DOWN_SEC = 0.25; // 조용해졌을 때 바닥이 내려오는 시간(초). 빠르게 내려와야 작은 타격도 잡힌다
export const HIT_DB = 30;           // 문턱보다 이만큼 크면 세기 1. 조절판의 「세기 범위」가 이 값이다
export const BLOCK = 128;           // 소리를 이만큼씩 끊어 본다. 44100Hz 에서 약 3ms

// ─── 꼭두 (move.js · stage.js) ───────────────────────────────────────────
export const ARM_REST = 14;         // 팔을 내렸을 때의 각도(도). 모터가 쓰는 값이다
export const ARM_HIGH = 112;        // 팔을 끝까지 올렸을 때의 각도. 동래학춤의 일자사위처럼 옆으로 펼친다
export const BODY_TURN = 28;        // 몸통이 돌아가는 최대 각도
export const BOTH_ARMS = 0.6;       // 이보다 세게 치면 두 팔이 함께 펼쳐진다 (일자사위)
export const BODY_LAG = 0.35;       // 몸통이 팔을 뒤따르는 늦음(초)

// ─── 천 (cloth.js) ───────────────────────────────────────────────────────
export const CLOTH_NODES = 11;      // 소매 하나를 이만큼의 마디로 나눈다. 많을수록 부드럽고 느리다
export const CLOTH_STEPS = 3;       // 한 프레임에 마디를 몇 번 당겨 맞추나
export const GRAVITY = 1600;        // 천이 아래로 당겨지는 힘
export const DAMP = 0.985;          // 천이 흔들림을 잃는 정도. 1 이면 영원히 흔들린다
export const HEM_NODES = 7;         // 도포 자락(아랫단)의 마디 수
