# 켜기 (윈도우 PowerShell)
#
#   .\start.ps1                 마이크로 켠다. 아두이노가 꽂혀 있으면 찾아서 연결한다
#   .\start.ps1 --sim           악기 없이 가짜 타격으로
#   .\start.ps1 --display       조절판 없이 무대만 (전시용 화면)
#   .\start.ps1 --offline 20    장비 없이 20초를 out.mp4 로 적는다
#   .\start.ps1 --serial off    아두이노를 찾지 않는다
#   .\start.ps1 --port 7001     포트를 바꾼다
#
# conda 환경(clothdance)으로 켠다.
Set-Location $PSScriptRoot
. .\scripts\conda.ps1
$Conda = Find-Conda
if (-not $Conda) { Write-Host "conda 가 없습니다. 먼저 설치해 주세요:  .\install.ps1" -ForegroundColor Red; exit 1 }
if (-not (Test-CondaEnv $Conda)) { Write-Host "conda 환경($EnvName)이 없습니다. 먼저 설치해 주세요:  .\install.ps1" -ForegroundColor Red; exit 1 }
& $Conda run --no-capture-output -n $EnvName python serve.py @args
