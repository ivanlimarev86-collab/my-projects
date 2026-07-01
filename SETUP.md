# Как работать над проектом с двух устройств (комп + ноут)

GitHub — «центральное хранилище». Комп и ноут синхронизируются через него.

```
   Комп  ──push──►  GitHub  ◄──push──  Ноут
         ◄─pull──           ──pull──►
```

**Главное правило:** в начале работы — забрать свежее, в конце — отдать своё.
Со скриптом `sync.sh` это одна команда.

---

## Часть 1. Настройка авторизации (один раз на КАЖДОМ устройстве)

Чтобы push/pull работали без ввода паролей — ставим GitHub CLI и логинимся.

**macOS:**
```bash
brew install gh
gh auth login
```

**Linux (Debian/Ubuntu):**
```bash
sudo apt install gh        # либо см. https://github.com/cli/cli#installation
gh auth login
```

В мастере `gh auth login` выбирай:
- **GitHub.com**
- **HTTPS**
- **Yes** (authenticate Git with your GitHub credentials)
- **Login with a web browser** — откроется браузер, подтверди вход.

После этого git будет авторизовываться сам. Пароли/токены вводить больше не нужно.

---

## Часть 2. Получить проект

### На КОМПЕ (код уже есть локально)
Если папка уже связана с GitHub — пропусти. Если нет:
```bash
cd путь/к/проекту
git remote add origin https://github.com/ivanlimarev86-collab/my-projects.git
git checkout claude/disciples-2-mobile-branch-y5qpsi
./sync.sh "Первая загрузка кода игры"
```

### На НОУТЕ (с нуля)
```bash
cd ~/projects
git clone https://github.com/ivanlimarev86-collab/my-projects.git
cd my-projects
git checkout claude/disciples-2-mobile-branch-y5qpsi
```

---

## Часть 3. Ежедневная работа (на любом устройстве)

Один скрипт делает всё: pull → commit → push.

```bash
./sync.sh                       # авто-сообщение коммита
./sync.sh "что именно сделал"   # своё сообщение
```

Если скрипт не запускается, один раз дай ему права:
```bash
chmod +x sync.sh
```

---

## Памятка, чтобы не было конфликтов

- **Сел за устройство → сначала `./sync.sh`** (или `git pull`), потом работай.
- **Закончил → `./sync.sh`**, чтобы отдать изменения.
- Не оставляй незапушенный код на одном устройстве, пересаживаясь на другое.

### Если pull выдал конфликт
Git покажет файлы с пометками `<<<<<<<`, `=======`, `>>>>>>>`.
Открой их, оставь нужный вариант, убери пометки, затем:
```bash
git add -A
git rebase --continue   # если был rebase (как в sync.sh)
./sync.sh
```
