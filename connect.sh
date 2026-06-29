#!/usr/bin/env bash
#
# connect.sh — ОДНОРАЗОВАЯ настройка устройства (ПК/ноут) на общую ветку.
# Запусти один раз на каждом компьютере. Дальше для работы используй ./sync.sh
#
# Что делает:
#   1) проверяет/ставит связь с репозиторием на GitHub (origin)
#   2) переключается на общую ветку (создаёт локально, если надо)
#   3) забирает свежий код
#
set -euo pipefail

REPO_URL="https://github.com/ivanlimarev86-collab/my-projects.git"
BRANCH="claude/disciples-2-mobile-branch-y5qpsi"

echo "▶ Репозиторий: $REPO_URL"
echo "▶ Общая ветка: $BRANCH"

# 1) origin
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "✖ Здесь нет git-репозитория. Сначала склонируй проект:"
  echo "    git clone $REPO_URL && cd my-projects && ./connect.sh"
  exit 1
fi
if ! git remote get-url origin >/dev/null 2>&1; then
  echo "▶ Добавляю origin..."; git remote add origin "$REPO_URL"
fi

# 2) ветка
echo "▶ Забираю ветку с GitHub..."
git fetch origin "$BRANCH"
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git checkout "$BRANCH"
else
  git checkout -b "$BRANCH" --track "origin/$BRANCH"
fi

# 3) свежий код
git pull origin "$BRANCH"

echo ""
echo "✅ Устройство подключено к общей ветке."
echo "   Дальше: работаешь и запускаешь  ./sync.sh  — он забирает чужое и пушит твоё."
