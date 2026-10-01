/*
  보드에 올리는 스케치. 노트북이 보낸 각도대로 서보 세 개를 돌린다.

  노트북(serve.py)이 한 줄씩 보낸다.   왼팔,오른팔,몸통\n     예: 120,45,96
  각도는 0~180 이다. 이 스케치는 받은 각도로 바로 가지 않고 조금씩 따라간다.
  서보가 한 번에 튀면 가벼운 꼭두가 통째로 흔들리고, 천이 제대로 펼쳐지지 않는다.

  올리는 법
    1. 아두이노 IDE 를 연다
    2. 이 폴더(arduino/clothdance)를 연다
    3. 보드와 포트를 고르고 업로드를 누른다
    4. 노트북에서 ./start.sh 를 켜면 바로 움직인다

  연결
    왼팔 서보 신호선   D9        서보의 전원은 보드가 아니라 따로 둔 5V 전원에서 받는다.
    오른팔 서보 신호선 D10       보드의 5V 로 서보 셋을 돌리면 보드가 꺼졌다 켜졌다 한다.
    몸통 서보 신호선   D11       전원의 GND 와 보드의 GND 는 반드시 함께 묶는다.
*/

#include <Servo.h>

const int PIN_LEFT = 9;
const int PIN_RIGHT = 10;
const int PIN_BODY = 11;

// 서보가 목표 각도를 따라가는 빠르기. 1에 가까울수록 즉각 튀고, 작을수록 느리게 따라간다
const float FOLLOW = 0.25;

// 구조가 버티는 범위. 꼭두가 부서지지 않게 여기서 한 번 더 막는다
const int MIN_DEG = 10;
const int MAX_DEG = 170;

Servo armLeft, armRight, body;
float nowL = 20, nowR = 20, nowB = 90;
int wantL = 20, wantR = 20, wantB = 90;
unsigned long lastWord = 0;
char line[32];
int fill = 0;

int clampDeg(int v) {
  if (v < MIN_DEG) return MIN_DEG;
  if (v > MAX_DEG) return MAX_DEG;
  return v;
}

void setup() {
  Serial.begin(115200);
  armLeft.attach(PIN_LEFT);
  armRight.attach(PIN_RIGHT);
  body.attach(PIN_BODY);
}

void loop() {
  // 한 줄이 다 들어오면 숫자 셋으로 끊어 읽는다
  while (Serial.available()) {
    char ch = Serial.read();
    if (ch == '\n' || fill >= (int)sizeof(line) - 1) {
      line[fill] = 0;
      fill = 0;
      int a, b, c;
      if (sscanf(line, "%d,%d,%d", &a, &b, &c) == 3) {
        wantL = clampDeg(a);
        wantR = clampDeg(b);
        wantB = clampDeg(c);
        lastWord = millis();
      }
    } else if (ch != '\r') {
      line[fill++] = ch;
    }
  }

  // 노트북이 조용하면 천천히 팔을 내린다. 프로그램이 멈춰도 팔이 들린 채 굳지 않게 한다
  if (millis() - lastWord > 2000) {
    wantL = MIN_DEG + 10;
    wantR = MIN_DEG + 10;
    wantB = 90;
  }

  nowL += (wantL - nowL) * FOLLOW;
  nowR += (wantR - nowR) * FOLLOW;
  nowB += (wantB - nowB) * FOLLOW;
  armLeft.write((int)nowL);
  armRight.write((int)nowR);
  body.write((int)nowB);
  delay(15);
}
