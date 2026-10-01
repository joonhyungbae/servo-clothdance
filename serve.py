#!/usr/bin/env python3
"""
시작하는 자리. web/ 폴더를 작은 웹 서버로 띄우고 브라우저를 연다.

브라우저가 타격을 듣고 몸짓을 계산한다. 여기로는 모터 각도만 내려온다. 그 각도를 두 길로 내보낸다.
  시리얼        아두이노가 받아 서보를 돌린다 (arduino/clothdance 를 보드에 올려 둔다)
  OSC           터치디자이너나 맥스로 넘길 때 쓴다 (--osc 로 주소를 바꾼다)
그리고 /move.json 으로도 마지막 각도를 읽어 갈 수 있다.

  python3 serve.py                 마이크로 켠다
  python3 serve.py --sim           악기 없이 가짜 타격으로
  python3 serve.py --offline 10    10초 동안의 무대를 out.mp4(또는 out.webm)로 적고 끝낸다
  python3 serve.py --serial auto   아두이노를 찾아 연결한다 (기본). 끄려면 --serial off
  python3 serve.py --host 0.0.0.0  다른 컴퓨터에서 본다
  python3 serve.py --port 7001     포트를 바꾼다. 쓰이고 있으면 다음 빈 번호를 찾는다

보드가 없어도, pyserial 이 없어도 화면은 그대로 돈다. 그래야 장비가 오기 전에 몸짓을 만들 수 있다.
"""

from __future__ import annotations

import argparse
import functools
import glob
import json
import http.server
import platform
import subprocess
import sys
import threading
import webbrowser
from pathlib import Path
from urllib.parse import parse_qs, quote, urlparse

HERE = Path(__file__).parent
WEB = HERE / "web"


def find_board() -> str | None:
    """아두이노가 꽂힌 자리를 찾는다. 맥은 usbmodem, 리눅스는 ttyACM, 윈도우는 COM 이다."""
    try:
        from serial.tools import list_ports

        ports = list(list_ports.comports())
        for port in ports:
            name = f"{port.manufacturer or ''} {port.description or ''}".lower()
            if any(k in name for k in ("arduino", "wch", "ch340", "silicon labs", "ftdi")):
                return port.device
        if ports:
            return ports[0].device
    except ImportError:
        pass
    for pattern in ("/dev/tty.usbmodem*", "/dev/tty.usbserial*", "/dev/ttyACM*", "/dev/ttyUSB*"):
        hits = sorted(glob.glob(pattern))
        if hits:
            return hits[0]
    return None


class Board:
    """아두이노로 각도를 보낸다. 없으면 조용히 아무것도 하지 않는다."""

    def __init__(self, where: str, baud: int = 115200):
        self.port = None
        self.where = where
        try:
            import serial
        except ImportError:
            print("pyserial 이 없어 모터로 보내지 않습니다. 화면은 그대로 돕니다.")
            return
        if where in ("", "auto"):
            where = find_board() or ""
        if not where:
            print("아두이노를 찾지 못했습니다. 보드를 꽂고 다시 켜면 그때 보냅니다.")
            return
        try:
            self.port = serial.Serial(where, baud, timeout=0, write_timeout=0)
            self.where = where
            print(f"아두이노에 연결했습니다: {where}")
        except Exception as exc:
            print(f"아두이노에 연결하지 못했습니다({exc}). 화면은 그대로 돕니다.")

    def send(self, left: float, right: float, body: float) -> None:
        if not self.port:
            return
        try:
            self.port.write(f"{left:.0f},{right:.0f},{body:.0f}\n".encode())
        except Exception:
            self.port = None   # 선이 빠져도 화면은 멈추지 않는다


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
    }
    on_saved = None   # --offline 일 때 파일을 받으면 부른다
    latest = {}       # 브라우저가 마지막으로 보낸 각도
    board = None
    osc = None

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self) -> None:
        # 다른 프로그램이 각도를 읽어 가는 자리
        if urlparse(self.path).path == "/move.json":
            body = json.dumps(Handler.latest).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def do_POST(self) -> None:
        url = urlparse(self.path)

        # 브라우저가 보내는 모터 각도
        if url.path == "/move":
            body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
            try:
                Handler.latest = json.loads(body)
            except ValueError:
                self.send_error(400)
                return
            left = float(Handler.latest.get("left", 0))
            right = float(Handler.latest.get("right", 0))
            turn = float(Handler.latest.get("body", 90))
            if Handler.board:
                Handler.board.send(left, right, turn)
            if Handler.osc:
                Handler.osc.send_message("/clothdance/left", left)
                Handler.osc.send_message("/clothdance/right", right)
                Handler.osc.send_message("/clothdance/body", turn)
            self.send_response(204)
            self.end_headers()
            return

        # --offline 녹화만 받는다. 이 컴퓨터에서 온 것만.
        if url.path != "/save" or self.client_address[0] not in ("127.0.0.1", "::1"):
            self.send_error(404)
            return
        ext = parse_qs(url.query).get("ext", ["webm"])[0]
        ext = ext if ext in ("mp4", "webm") else "webm"
        body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        out = HERE / f"out.{ext}"
        out.write_bytes(body)
        self.send_response(200)
        self.end_headers()
        print(f"{out.name} 에 적었습니다 ({len(body) / 1e6:.1f}MB).")
        if Handler.on_saved:
            Handler.on_saved()

    def log_message(self, *args) -> None:  # 요청마다 줄이 쌓이면 오류가 묻힌다
        pass


def open_browser(url: str) -> None:
    # 맥이면 크롬을 먼저 찾는다. 사파리도 되지만 크롬에서 가장 많이 시험했다.
    if platform.system() == "Darwin":
        if subprocess.run(["open", "-a", "Google Chrome", url], capture_output=True).returncode == 0:
            return
    webbrowser.open(url)


def bind(host: str, port: int) -> http.server.ThreadingHTTPServer:
    """포트가 쓰이고 있으면 다음 번호를 찾는다. 같은 것을 두 번 켜도 겹치지 않는다."""
    handler = functools.partial(Handler, directory=str(WEB))
    for p in range(port, port + 20):
        try:
            return http.server.ThreadingHTTPServer((host, p), handler)
        except OSError:
            continue
    print(f"{port}~{port + 19} 번이 모두 쓰이고 있습니다. --port 로 다른 번호를 주세요.")
    raise SystemExit(1)


def main() -> None:
    sys.stdout.reconfigure(line_buffering=True)  # 자동 시작 로그 파일에도 바로 적히게
    ap = argparse.ArgumentParser(description="두드리면 춤추는 꼭두를 띄운다")
    ap.add_argument("--sim", action="store_true", help="마이크 없이 가짜 타격으로")
    ap.add_argument("--display", action="store_true", help="조절판 없이 무대만")
    ap.add_argument("--offline", type=float, default=0, help="초 단위. 장비 없이 그만큼을 out.mp4 로 적는다")
    ap.add_argument("--host", default="127.0.0.1", help="다른 기기에서 보려면 0.0.0.0")
    ap.add_argument("--port", type=int, default=7000)
    ap.add_argument("--no-open", action="store_true", help="브라우저를 열지 않는다")
    ap.add_argument("--query", default="", help="주소 뒤에 그대로 붙일 것. 예: display")
    ap.add_argument("--serial", default="auto", help="아두이노가 꽂힌 자리. 끄려면 --serial off")
    ap.add_argument("--baud", type=int, default=115200, help="아두이노와 맞춰 둔 속도")
    ap.add_argument("--osc", default="off", help="각도를 OSC 로 보낼 곳. 예: 127.0.0.1:7400")
    args = ap.parse_args()

    q = []
    if args.offline:
        q += ["sim", f"offline={args.offline:g}"]
    elif args.sim:
        q.append("sim")
    if args.display:
        q.append("display")
    if args.query:
        q.append(args.query)

    if args.serial != "off" and not args.offline:
        Handler.board = Board(args.serial, args.baud)

    if args.osc and args.osc != "off":
        try:
            from pythonosc.udp_client import SimpleUDPClient

            host, _, port_s = args.osc.partition(":")
            Handler.osc = SimpleUDPClient(host or "127.0.0.1", int(port_s or 7400))
            print(f"각도를 OSC 로 보냅니다: {args.osc}  (/clothdance/left · /clothdance/right · /clothdance/body)")
        except Exception as exc:
            print(f"OSC 를 켜지 못했습니다({exc}). /move.json 으로는 그대로 받을 수 있습니다.")

    server = bind(args.host, args.port)
    port = server.server_address[1]
    url = f"http://127.0.0.1:{port}/" + ("?" + "&".join(q) if q else "")

    if args.offline:
        Handler.on_saved = lambda: threading.Thread(target=server.shutdown).start()
        print(f"{args.offline:g}초 동안의 무대를 녹화합니다. 브라우저가 열렸다가 끝나면 out 파일이 생깁니다.")
    else:
        print(f"열렸습니다: {url}")
        print("마이크는 브라우저에서 「듣기 시작」을 눌러야 열립니다. 악기가 없으면 「손으로 치기」로 먼저 봅니다.")
        print("끝내려면 Ctrl+C (창을 닫아도 됩니다)")
    if not args.no_open:
        threading.Timer(0.8, open_browser, [url]).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n껐습니다.")


if __name__ == "__main__":
    main()
