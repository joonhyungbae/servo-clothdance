#!/usr/bin/env bash
#
# 켜기 (맥 · 리눅스)
#
#   ./start.sh                 마이크로 켠다. 아두이노가 꽂혀 있으면 찾아서 연결한다
#   ./start.sh --sim           악기 없이 가짜 타격으로
#   ./start.sh --display       조절판 없이 무대만 (전시용 화면)
#   ./start.sh --offline 20    장비 없이 20초를 out.mp4 로 적는다
#   ./start.sh --serial off    아두이노를 찾지 않는다
#   ./start.sh --host 0.0.0.0  다른 컴퓨터에서 본다
#   ./start.sh --port 7001     포트를 바꾼다
#
# conda 환경(clothdance)으로 켠다. conda 는 터미널 설정 없이도 찾는다(scripts/conda.sh).
set -euo pipefail
cd "$(dirname "$0")"
# shellcheck source=scripts/conda.sh
source scripts/conda.sh

CONDA="$(find_conda)" || { echo "conda 가 없습니다. 먼저 설치해 주세요:  bash install.sh" >&2; exit 1; }
env_exists "$CONDA" || { echo "conda 환경($ENV_NAME)이 없습니다. 먼저 설치해 주세요:  bash install.sh" >&2; exit 1; }

"$CONDA" run --no-capture-output -n "$ENV_NAME" python serve.py "$@"
