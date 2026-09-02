#!/usr/bin/env bash

# Deploy this Pages application and its D1 database. This script deliberately
# keeps secrets in stdin only; it never reads or writes .env files.
set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/wrangler.jsonc"
WRANGLER_BIN="${WRANGLER_BIN:-$PROJECT_ROOT/node_modules/.bin/wrangler}"

die() {
  printf '部署失败：%s\n' "$*" >&2
  exit 1
}

info() {
  printf '\n==> %s\n' "$*"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "未找到 $1。请安装后重试。"
}

config_value() {
  local key="$1"
  node - "$CONFIG_FILE" "$key" <<'NODE'
const fs = require("fs");
const [file, key] = process.argv.slice(2);
const source = fs.readFileSync(file, "utf8");
const match = source.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`));
if (!match) process.exit(1);
process.stdout.write(match[1]);
NODE
}

json_has_d1_id() {
  local json="$1" database_id="$2"
  node -e '
const id = process.argv[1];
const input = JSON.parse(require("fs").readFileSync(0, "utf8"));
const databases = Array.isArray(input) ? input : (input.result || []);
process.exit(databases.some(db => db.uuid === id || db.id === id || db.database_id === id) ? 0 : 1);
' "$database_id" <<<"$json"
}

json_d1_id_by_name() {
  local json="$1" database_name="$2"
  node -e '
const databaseName = process.argv[1];
const input = JSON.parse(require("fs").readFileSync(0, "utf8"));
const databases = Array.isArray(input) ? input : (input.result || []);
const database = databases.find(db => db.name === databaseName);
const id = database && (database.uuid || database.id || database.database_id);
if (typeof id !== "string") process.exit(1);
process.stdout.write(id);
' "$database_name" <<<"$json"
}

json_has_pages_project() {
  local json="$1" project_name="$2"
  node -e '
const projectName = process.argv[1];
const input = JSON.parse(require("fs").readFileSync(0, "utf8"));
const projects = Array.isArray(input) ? input : (input.result || []);
process.exit(projects.some(project => project.name === projectName) ? 0 : 1);
' "$project_name" <<<"$json"
}

replace_database_id() {
  local new_id="$1"
  node - "$CONFIG_FILE" "$new_id" <<'NODE'
const fs = require("fs");
const [file, newId] = process.argv.slice(2);
if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(newId)) {
  throw new Error("Wrangler 未返回有效的 D1 UUID");
}
const source = fs.readFileSync(file, "utf8");
const expression = /("database_id"\s*:\s*")[^"]+("\s*)/;
if (!expression.test(source)) throw new Error("wrangler.jsonc 中缺少 database_id");
fs.writeFileSync(file, source.replace(expression, `$1${newId}$2`));
NODE
}

created_d1_id() {
  local json="$1"
  node -e '
const output = require("fs").readFileSync(0, "utf8");
try {
  const input = JSON.parse(output);
  const database = input.result || input;
  const id = database.uuid || database.id || database.database_id;
  if (typeof id === "string") process.stdout.write(id);
  else process.exit(1);
} catch {
  const ids = [...new Set(output.match(/\b[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\b/gi) || [])];
  if (ids.length !== 1) process.exit(1);
  process.stdout.write(ids[0]);
}
' <<<"$json"
}

put_secret() {
  local key="$1" value="$2" project_name="$3"
  printf '%s' "$value" | "$WRANGLER_BIN" pages secret put "$key" --project-name "$project_name"
}

prompt_secret() {
  local label="$1" value
  [[ -t 0 ]] || die "需要交互式终端来安全输入 $label。"
  read -r -s -p "$label: " value
  printf '\n' >&2
  [[ -n "$value" ]] || die "$label 不能为空。"
  REPLY="$value"
}

configure_secrets() {
  local project_name="$1" answer nav_password ai_key ai_base_url ai_model
  info "配置生产密钥"
  prompt_secret "NAV_PASSWORD"
  nav_password="$REPLY"
  put_secret "NAV_PASSWORD" "$nav_password" "$project_name"
  unset nav_password

  read -r -p "是否配置 AI 网站分析？[y/N] " answer
  case "$answer" in
    y|Y|yes|YES)
      prompt_secret "AI_API_KEY"
      ai_key="$REPLY"
      read -r -p "AI_BASE_URL [https://api.openai.com/v1]: " ai_base_url
      ai_base_url="${ai_base_url:-https://api.openai.com/v1}"
      read -r -p "AI_MODEL [gpt-4.1-mini]: " ai_model
      ai_model="${ai_model:-gpt-4.1-mini}"
      put_secret "AI_API_KEY" "$ai_key" "$project_name"
      put_secret "AI_BASE_URL" "$ai_base_url" "$project_name"
      put_secret "AI_MODEL" "$ai_model" "$project_name"
      unset ai_key ai_base_url ai_model
      ;;
    *) info "跳过可选 AI 配置" ;;
  esac
}

ensure_d1_database() {
  local database_name="$1" configured_id="$2" database_list existing_id new_database new_id
  info "检查 D1 数据库 $database_name"
  database_list="$("$WRANGLER_BIN" d1 list --json)" || die "无法读取 D1 数据库列表。请确认令牌具备 D1 权限。"
  if json_has_d1_id "$database_list" "$configured_id"; then
    printf '复用已配置的 D1 数据库。\n'
    return
  fi

  # A cloned repository can contain an ID from another account while this
  # account already has a database with the same configured name.
  if existing_id="$(json_d1_id_by_name "$database_list" "$database_name")"; then
    replace_database_id "$existing_id" || die "无法安全更新 wrangler.jsonc。"
    printf '复用同名 D1 数据库，并更新了 wrangler.jsonc。\n'
    return
  fi

  info "当前账号无法访问配置中的 D1；在 APAC 创建 $database_name"
  new_database="$("$WRANGLER_BIN" d1 create "$database_name" --location apac)" \
    || die "无法创建 D1 数据库。"
  new_id="$(created_d1_id "$new_database")" || die "无法解析新 D1 数据库的 UUID。"
  replace_database_id "$new_id" || die "无法安全更新 wrangler.jsonc。"
  printf '已更新 wrangler.jsonc，D1 UUID 为 %s。\n' "$new_id"
}

ensure_pages_project() {
  local project_name="$1" project_list
  info "检查 Pages 项目 $project_name"
  project_list="$("$WRANGLER_BIN" pages project list --json)" || die "无法读取 Pages 项目列表。请确认令牌具备 Pages 权限。"
  if json_has_pages_project "$project_list" "$project_name"; then
    printf '复用已有 Pages 项目。\n'
  else
    "$WRANGLER_BIN" pages project create "$project_name" --production-branch main \
      || die "无法创建 Pages 项目。"
  fi
}

main() {
  [[ -f "$CONFIG_FILE" ]] || die "未找到 $CONFIG_FILE"
  require_command node
  require_command npm
  [[ -x "$WRANGLER_BIN" ]] || die "未找到 Wrangler：$WRANGLER_BIN。请先运行 npm install。"

  info "检查 Cloudflare 登录状态"
  "$WRANGLER_BIN" whoami >/dev/null || die "尚未登录 Cloudflare。请先运行 npx wrangler login。"

  local project_name database_name database_id
  project_name="$(config_value name)" || die "无法从 wrangler.jsonc 读取 Pages 项目名。"
  database_name="$(config_value database_name)" || die "无法从 wrangler.jsonc 读取 D1 名称。"
  database_id="$(config_value database_id)" || die "无法从 wrangler.jsonc 读取 D1 UUID。"

  info "类型检查"
  (cd "$PROJECT_ROOT" && npm run check)
  info "构建 Pages"
  (cd "$PROJECT_ROOT" && npm run build:pages)

  ensure_d1_database "$database_name" "$database_id"
  ensure_pages_project "$project_name"
  configure_secrets "$project_name"
  info "应用远端 D1 迁移"
  (cd "$PROJECT_ROOT" && "$WRANGLER_BIN" d1 migrations apply "$database_name" --remote)
  info "发布到 Cloudflare Pages"
  (cd "$PROJECT_ROOT" && "$WRANGLER_BIN" pages deploy dist/public --project-name "$project_name")
  printf '\n部署完成：https://%s.pages.dev\n' "$project_name"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
