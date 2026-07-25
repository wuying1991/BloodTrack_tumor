#!/usr/bin/env bash
# Switch LAB_REPORT_PROVIDER (+ optional fallback) in backend/.env
# Usage:
#   ./scripts/switch-lab-provider.sh              # interactive / list
#   ./scripts/switch-lab-provider.sh mock
#   ./scripts/switch-lab-provider.sh xai mock     # primary + fallback
#   ./scripts/switch-lab-provider.sh tencent mock
#   ./scripts/switch-lab-provider.sh show

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${LAB_REPORT_ENV_FILE:-$ROOT/.env}"
EXAMPLE="$ROOT/.env.example"

KNOWN=(mock xai openai openai_compatible tencent)

usage() {
  cat <<EOF
BloodTrack · 切换化验单识别模型

用法:
  $(basename "$0") show
  $(basename "$0") <provider> [fallback]
  $(basename "$0")              # 交互选择

可选 provider:
  mock               本地演示数据（默认）
  xai                xAI Grok 视觉（需 XAI_API_KEY）
  openai             OpenAI Vision（需 OPENAI_API_KEY）
  openai_compatible  兼容网关（LAB_REPORT_BASE_URL）
  tencent            腾讯云 OCR（需 TENCENT_SECRET_ID/KEY）

示例:
  $(basename "$0") mock
  $(basename "$0") xai mock
  $(basename "$0") tencent mock

环境文件: $ENV_FILE
修改后请重启后端 (npm run dev)。
EOF
}

ensure_env_file() {
  if [[ ! -f "$ENV_FILE" ]]; then
    if [[ -f "$EXAMPLE" ]]; then
      cp "$EXAMPLE" "$ENV_FILE"
      echo "已从 .env.example 创建 $ENV_FILE"
    else
      touch "$ENV_FILE"
      echo "已创建空 $ENV_FILE"
    fi
  fi
}

set_kv() {
  local key="$1"
  local val="$2"
  if grep -qE "^[# ]*${key}=" "$ENV_FILE" 2>/dev/null; then
    # macOS / BSD sed
    if sed --version >/dev/null 2>&1; then
      sed -i -E "s|^[# ]*${key}=.*|${key}=${val}|" "$ENV_FILE"
    else
      sed -i '' -E "s|^[# ]*${key}=.*|${key}=${val}|" "$ENV_FILE"
    fi
  else
    printf '\n%s=%s\n' "$key" "$val" >>"$ENV_FILE"
  fi
}

show() {
  ensure_env_file
  echo "=== $ENV_FILE ==="
  grep -E '^(LAB_REPORT_|XAI_|OPENAI_|TENCENT_)' "$ENV_FILE" 2>/dev/null || echo "(尚未配置相关键)"
  echo
  echo "当前主模型: $(grep -E '^LAB_REPORT_PROVIDER=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || echo mock)"
  echo "回退链路:   $(grep -E '^LAB_REPORT_FALLBACK=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || echo '(默认)')"
}

is_known() {
  local p="$1"
  for k in "${KNOWN[@]}"; do
    [[ "$k" == "$p" ]] && return 0
  done
  return 1
}

apply() {
  local primary="$1"
  local fallback="${2:-mock}"

  if ! is_known "$primary"; then
    echo "未知 provider: $primary"
    usage
    exit 1
  fi

  ensure_env_file
  set_kv "LAB_REPORT_PROVIDER" "$primary"
  set_kv "LAB_REPORT_FALLBACK" "$fallback"
  # Keep override on in local so miniapp chips work
  set_kv "LAB_REPORT_ALLOW_CLIENT_OVERRIDE" "true"

  echo "已写入:"
  echo "  LAB_REPORT_PROVIDER=$primary"
  echo "  LAB_REPORT_FALLBACK=$fallback"
  echo "  LAB_REPORT_ALLOW_CLIENT_OVERRIDE=true"
  echo
  case "$primary" in
    xai)
      echo "提示: 请确认已设置 XAI_API_KEY / XAI_VISION_MODEL"
      ;;
    openai|openai_compatible)
      echo "提示: 请确认 OPENAI_API_KEY 或 LAB_REPORT_API_KEY、LAB_REPORT_BASE_URL、LAB_REPORT_MODEL"
      ;;
    tencent)
      echo "提示: 请确认 TENCENT_SECRET_ID、TENCENT_SECRET_KEY（可选 TENCENT_OCR_REGION）"
      ;;
    mock)
      echo "提示: Mock 无需密钥，小程序点「演示识别」即可"
      ;;
  esac
  echo
  echo "请重启后端使配置生效: cd backend && npm run dev"
  show
}

interactive() {
  echo "选择主识别模型:"
  local i=1
  for k in "${KNOWN[@]}"; do
    echo "  $i) $k"
    i=$((i + 1))
  done
  read -r -p "编号 [1-${#KNOWN[@]}]: " idx
  if ! [[ "$idx" =~ ^[0-9]+$ ]] || (( idx < 1 || idx > ${#KNOWN[@]} )); then
    echo "无效选择"
    exit 1
  fi
  local primary="${KNOWN[$((idx - 1))]}"
  read -r -p "回退模型 (默认 mock): " fb
  fb="${fb:-mock}"
  apply "$primary" "$fb"
}

main() {
  case "${1:-}" in
    -h|--help|help) usage ;;
    show|"")
      if [[ "${1:-}" == "show" ]]; then
        show
      else
        interactive
      fi
      ;;
    *)
      apply "$1" "${2:-mock}"
      ;;
  esac
}

main "$@"
