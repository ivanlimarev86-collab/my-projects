#!/usr/bin/env bash
#
# sync.sh — синхронизация проекта между компом, ноутом и GitHub.
#
# Использование:
#   ./sync.sh                 — забрать свежее, закоммитить и запушить своё
#   ./sync.sh "моё сообщение" — то же, но со своим текстом коммита
#
# Что делает по шагам:
#   1) забирает свежие изменения с GitHub (pull --rebase)
#   2) добавляет и коммитит твои локальные изменения (если они есть)
#   3) пушит всё обратно на GitHub
#
set -euo pipefail

# Текущая ветка
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

echo "▶ Ветка: $BRANCH"
echo "▶ 1/3 Забираю свежие изменения с GitHub..."
git pull --rebase origin "$BRANCH"

# Есть ли что коммитить?
if [[ -n "$(git status --porcelain)" ]]; then
  MSG="${1:-Обновление $(date '+%Y-%m-%d %H:%M')}"
  echo "▶ 2/3 Коммичу локальные изменения: \"$MSG\""
  git add -A
  git commit -m "$MSG"
else
  echo "▶ 2/3 Локальных изменений нет — коммитить нечего."
fi

echo "▶ 3/3 Пушу на GitHub..."
git push origin "$BRANCH"

echo "✅ Готово. Комп, ноут и GitHub синхронизированы."
