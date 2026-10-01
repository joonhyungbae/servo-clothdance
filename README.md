# servo-clothdance

**악기를 두드리면 흰 도포를 입은 꼭두가 팔을 펼쳤다가 천천히 내려놓습니다.** 세게 치면 두 팔이
함께 올라가고, 내려오기 전에 또 치면 그 위에 얹혀 더 높아집니다. 치기를 멈추면 소매와 아랫단이
뒤늦게 흔들리다 가라앉습니다.

노트북과 마이크로 돕니다. 타격을 듣는 일은 브라우저의 소리 담당 스레드가 하고, 꼭두와 천은
화면에서 먼저 움직입니다. 그 각도를 그대로 아두이노로 보내면 서보가 같은 몸짓을 합니다.
완성된 작품이 아니라 출발점이고, 바꿔 가며 자기 작품으로 만들라고 둔 예제입니다.

설치 없이 보려면 <https://joonhyungbae.github.io/servo-clothdance/> 를 크롬으로 엽니다.
「손으로 치기」나 스페이스로 먼저 눌러 보고, 「듣기 시작」을 누르면 마이크로 진짜 타격을 듣습니다.

《2026 오픈서킷 부산: 아트앤테크 프랙티스》 멘토링 과정에서 만든 예제입니다. 참여 작가와
작업을 구상하다 공통으로 쓸 만한 뼈대가 나와, 참여자 누구나 쓸 수 있도록 공개합니다.

## 1. 깔기

터미널을 엽니다. 윈도우는 시작 메뉴에서 `PowerShell`, 맥은 `터미널`입니다.

**맥 · 리눅스**

```bash
curl -fsSL https://raw.githubusercontent.com/joonhyungbae/servo-clothdance/main/install.sh | bash
```

**윈도우 (PowerShell)**

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
irm https://raw.githubusercontent.com/joonhyungbae/servo-clothdance/main/install.ps1 -OutFile "$env:TEMP\install.ps1"
& "$env:TEMP\install.ps1"
```

설치가 챙기는 것: conda 환경(`clothdance`)과 아두이노로 각도를 보내는 pyserial.
conda 가 없으면 [Miniforge](https://conda-forge.org/download/)를 사용자 폴더에 먼저 깝니다.
받아 올 모델이나 자료가 없어서 금방 끝납니다.

## 2. 켜기

```bash
./start.sh          # 맥 · 리눅스
.\start.ps1         # 윈도우
```

브라우저가 저절로 열립니다. 안 열리면 `127.0.0.1:7000` 을 칩니다. 끌 때는 <kbd>Ctrl</kbd>+<kbd>C</kbd>.
아두이노가 꽂혀 있으면 저절로 찾아 연결하고, 없으면 화면만 움직입니다.

| 명령 | 하는 일 |
|---|---|
| `./start.sh` | 마이크로 켠다. 보드가 있으면 찾아 연결한다 |
| `./start.sh --sim` | 악기 없이 가짜 타격으로. 저절로 두드린다 |
| `./start.sh --display` | 조절판 없이 무대만. 전시용 화면이다 |
| `./start.sh --offline 20` | 20초를 녹화해 out 파일로 적고 끝낸다 |
| `./start.sh --serial off` | 아두이노를 찾지 않는다 |
| `./start.sh --port 7001` | 포트를 바꾼다 |

마이크는 화면의 **듣기 시작**을 눌러야 열립니다. 브라우저가 그렇게 막아 둡니다.

## 3. 화면에서 보는 것

- **왼쪽 큰 화면**: 꼭두와 천. 팔은 모터가 움직이고, 소매와 아랫단은 뒤따라 흔들립니다
- **타격**: 지금 들리는 소리, 마지막 타격의 세기, 몰아치는 정도
- **모터로 나가는 각도**: 왼팔 · 오른팔 · 몸통. 아두이노로 나가는 값과 같습니다
- **조절**: 타격 문턱부터 천의 가벼움까지. 바꾼 값은 이 브라우저에 남습니다

## 4. 바꾸는 자리

1. **`web/settings.js`** — 숫자가 전부 여기 있습니다. 조절판 항목도 이 파일에서 만듭니다.
2. **`web/move.js`** — 타격 하나가 어떤 몸짓이 되는지 정합니다. 이 파일만 고쳐도 다른 춤이 나옵니다.
3. **`web/cloth.js`** — 천의 무게와 늦음입니다. 명주와 무명의 차이가 여기서 납니다.
4. **`web/stage.js`** — 꼭두를 어떻게 그릴지. 갓, 도포, 소매의 모양입니다.

고치고 브라우저를 새로 고치면 바로 보입니다. 빌드가 없습니다.

## 5. 모터로 내보내기

`arduino/clothdance/clothdance.ino` 를 아두이노 IDE 로 열어 보드에 한 번 올려 둡니다.
서보 세 개를 D9(왼팔) · D10(오른팔) · D11(몸통)에 꽂습니다. 노트북이 한 줄씩 보냅니다.

```text
120,45,96     왼팔,오른팔,몸통 각도. 0~180
```

서보의 전원은 보드가 아니라 따로 둔 5V 전원에서 받습니다. 보드의 5V 로 서보 셋을 돌리면
보드가 꺼졌다 켜졌다 합니다. 전원의 GND 와 보드의 GND 는 반드시 함께 묶습니다.

보드 쪽 스케치는 받은 각도로 바로 가지 않고 조금씩 따라갑니다. 서보가 한 번에 튀면 가벼운
꼭두가 통째로 흔들리고 천이 제대로 펼쳐지지 않습니다. 노트북이 조용해지면 2초 뒤에 팔을
내려놓습니다. 프로그램이 멈춰도 팔이 들린 채 굳지 않게 하려는 것입니다.

터치디자이너나 맥스로 넘기려면 `--osc 127.0.0.1:7400` 으로 켭니다. `/clothdance/left` ·
`/clothdance/right` · `/clothdance/body` 로 나갑니다. `http://127.0.0.1:7000/move.json` 을 읽어도 됩니다.

## 6. 안 될 때

| 이런 일이 생기면 | 이렇게 합니다 |
|---|---|
| 마이크가 안 열린다 | 「듣기 시작」을 눌렀는지, 브라우저가 권한을 물었는지 봅니다. 주소가 localhost 이거나 https 여야 합니다 |
| 아무 소리에나 팔이 올라간다 | 조절판의 「타격 문턱」을 올립니다. 마이크를 악기 가까이 둡니다 |
| 세게 쳐도 반응이 작다 | 「타격 문턱」을 내리고 「몸짓 크기」를 올립니다 |
| 한 번 쳤는데 두 번으로 센다 | 「다음 타격까지」를 늘립니다. 울림이 긴 징은 0.3초쯤 둡니다 |
| 보드를 못 찾는다 | `./start.sh --serial /dev/tty.usbmodem1101` 처럼 자리를 직접 적습니다. 아두이노 IDE 의 포트 목록에 있는 이름입니다 |
| 서보가 떨리거나 보드가 꺼진다 | 서보 전원을 보드가 아니라 따로 둔 5V 에서 받습니다 |
| 포트가 쓰이고 있다 | `./start.sh --port 7001` 처럼 바꿉니다 |

## 7. 더 들어가기

```text
serve.py                web/ 를 띄우고, 각도를 받아 아두이노·OSC 로 내보낸다
arduino/clothdance/     보드에 올리는 스케치. 서보 세 개를 돌린다
web/
├── settings.js         만지는 숫자
├── hear-worklet.js     소리 담당 스레드에서 타격을 찾는다
├── listen.js           타격 사건을 내보낸다 (마이크 · 가짜 타격)
├── move.js             타격 → 꼭두의 몸짓과 모터 각도
├── cloth.js            소매와 아랫단의 천 (베를레)
├── stage.js            꼭두를 그린다
└── app.js              위의 것들을 한 프레임마다 잇는다
```

타격을 찾는 일은 화면 그리기와 떨어진 자리에서 합니다. 창이 가려져 그림이 멈춰도 타격을
놓치지 않습니다. 문턱은 방의 바닥 소음을 따라 움직입니다. 고정된 문턱을 두면 조용한 방에서는
숨소리에도 터지고 사람이 많은 전시장에서는 북을 쳐도 안 잡힙니다.

왜 이렇게 만들었는지는 [docs/notes.md](docs/notes.md). AI 도구로 고칠 때의 규칙은 [AGENTS.md](AGENTS.md).

## 쓰는 것과 라이선스

브라우저에 들어 있는 것(Web Audio, Canvas)만 씁니다. 받아 오는 라이브러리가 없어서 인터넷
없이 돕니다. 보드 쪽은 아두이노의 Servo 라이브러리를 씁니다. 전체 목록은 [NOTICE.md](NOTICE.md).

코드는 [OpenCircuit License v1.0](LICENSE)을 따릅니다. 오픈소스가 아니라 소스를 공개하되
쓰임을 제한합니다.

- **됩니다**: 받아서 쓰고 고치기. 이것으로 만든 **작품**은 전시하고 팔아도 허가가 필요 없습니다.
- **문의해 주세요**: 강좌나 워크숍의 교재로 쓰는 것, 코드 자체를 파는 것. <jh.bae@kaist.ac.kr>

---

<details>
<summary>English</summary>

Hit a drum in front of a laptop and a puppet in a white robe spreads its arms, then lets them
down. A hard hit raises both arms; hits that come before the arms have settled stack up. When
you stop, the sleeves and the hem keep moving for a while.

```bash
curl -fsSL https://raw.githubusercontent.com/joonhyungbae/servo-clothdance/main/install.sh | bash
cd servo-clothdance && ./start.sh --sim
```

Onset detection runs in an AudioWorklet with a threshold that follows the room's noise floor.
The same angles that drive the drawing go out to an Arduino over serial (`left,right,body\n`),
so the rule can be tuned before any hardware arrives. Two files are yours to rewrite:
`web/move.js` (what a hit means) and `web/cloth.js` (how the cloth lags).

Source-available, not open source: personal and artistic use is free and the works you make are
entirely yours; teaching with it or selling it needs permission ([LICENSE](LICENSE)).

</details>

<sub>《2026 오픈서킷 부산: 아트앤테크 프랙티스》에서 만든 작품 베이스라인입니다. 다른 도구는
[opencircuit](https://github.com/joonhyungbae/opencircuit)에 모여 있습니다.</sub>
