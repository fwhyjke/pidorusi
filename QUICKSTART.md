# QUICKSTART для агента (Windows / WSL)

Этот файл для ИИ-агента, который запускает проект на чужой машине с Windows или WSL. Проект собран на macOS. Здесь описано, что нужно сделать у себя, чтобы всё заработало. Сам проект менять не нужно.

**Порядок чтения:**
1. Этот файл: окружение и проверка.
2. `CLAUDE.md`: о проекте, стек и порядок работы.
3. `.claude/skills/*`: инструкции по шагам (nolan → voice → genvideo).

Описание окружения в `CLAUDE.md` («macOS», «шрифты подхватываются сами») относится к машине автора. Для Windows и WSL вместо него действуют разделы ниже.

## 1. Где запускать

**Рекомендуется WSL2 (Ubuntu).** Команды в `CLAUDE.md` и скиллах написаны под bash.
- Держи проект в файловой системе Linux, например `~/aithemes`, а не в `/mnt/c/...`: там рендер и npm работают в разы медленнее.
- Claude Code запускай внутри WSL, из папки проекта.

**Windows без WSL тоже работает,** но:
- bash-команды из скиллов выполняй в Git Bash или переводи в PowerShell: `cp -R` → `Copy-Item -Recurse`, `sleep 20` → `Start-Sleep 20`, `curl` → `curl.exe`;
- смотри раздел 5 про пути.

## 2. Установка

**WSL / Ubuntu:**
```bash
sudo apt update && sudo apt install -y ffmpeg fontconfig unzip curl
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc && nvm install --lts
```

**Windows (PowerShell):**
```powershell
winget install OpenJS.NodeJS.LTS
winget install Gyan.FFmpeg
```
После установки перезапусти терминал, чтобы обновился PATH.

**Проверка (обе системы):**
```bash
node -v
ffmpeg -hide_banner -encoders | grep -E "libx264|libmp3lame"
```
Нужны оба кодека: `libx264` для видео и `libmp3lame` для звука. Сборки из apt и Gyan их содержат.

**Зависимости рендера.** Папка `node_modules` в проект не входит. Пакет `@napi-rs/canvas` сам скачает бинарник под твою платформу:
```bash
cd render && npm install
```
Если в `render/` уже лежит `node_modules`, скопированный с другой машины, удали его и поставь заново: бинарник с macOS на Windows и Linux не работает.

## 3. Шрифты (обязательно)

Код ищет шрифты строго по имени семейства (`render/lib/core.js`):
- `Inter` — весь текст, нужна кириллица;
- `JetBrainsMono Nerd Font Mono` — цифры HUD и таймеров, моноширинные.

Если какого-то из них нет, рендер не упадёт, а тихо подставит другой шрифт. Кириллица может пропасть или стать другой, цифры перестанут быть моноширинными, а длина строк и вёрстка плашек поедут. Поэтому проверь:
```bash
cd render && node -e "const {GlobalFonts:F}=require('@napi-rs/canvas');console.log('Inter:',F.has('Inter'),'| JetBrainsMono Nerd Font Mono:',F.has('JetBrainsMono Nerd Font Mono'))"
```

Оба значения должны быть `true`. Если нет, установи шрифты. Обе гарнитуры под лицензией OFL, но скачивание всё равно согласуй с пользователем.
- **Inter:** https://github.com/rsms/inter/releases/latest, архив `Inter-*.zip`.
- **JetBrains Mono Nerd Font:** https://github.com/ryanoasis/nerd-fonts/releases/latest/download/JetBrainsMono.zip. Нужны файлы `JetBrainsMonoNerdFontMono-*.ttf`: именно у них семейство называется `JetBrainsMono Nerd Font Mono`. Обычный JetBrains Mono имеет другое имя и не подойдёт.

**Куда ставить:**
- **WSL / Linux:** скопируй `.ttf` в `~/.local/share/fonts/`, затем выполни `fc-cache -f`.
- **Windows:** через правый клик → «Установить для всех пользователей», чтобы шрифты попали в `C:\Windows\Fonts`. Установка «только для меня» кладёт их в профиль, и рендер может их не увидеть.

После установки повтори проверку.

**Если поставить в систему нельзя,** зарегистрируй файлы в своей копии проекта. Добавь в начало `render/lib/core.js`:
```js
const { GlobalFonts } = require('@napi-rs/canvas');
GlobalFonts.loadFontsFromDir(require('path').join(__dirname, '..', 'fonts')); // render/fonts/*.ttf
```
и положи `.ttf` в `render/fonts/`.

## 4. Проверка, что всё работает

Запускай из `render/`. Без флага `--ep` используется заготовка `ep_template`.
```bash
node render.js --still 2,110.6          # кадры -> out/stills/, контактный лист -> out/sheet.png
node audio.js --dst out/test.mp3        # фоновый звук 1:52
node render.js --workers 4 --dst out/test.mp4   # полный рендер заготовки, 1–3 мин
```

**Что проверить:**
- `out/sheet.png`: на нём HUD («ВРЕМЯ», «ПОКАЗАТЕЛЬ»), надпись «СЦЕНА 1» и карточка «ПРОДОЛЖЕНИЕ В ПРОФИЛЕ». Кириллица читается, цифры моноширинные.
- `out/test.mp4` длится 112 с (`ffprobe -v error -show_entries format=duration -of csv=p=0 out/test.mp4`).

После проверки удали `out/test.*`.

**Число воркеров:** ядра минус 2 (`nproc` в WSL, `$env:NUMBER_OF_PROCESSORS` в PowerShell). В скиллах указано `--workers 8`, подставь своё число.

## 5. Особенности Windows и WSL

- **Пути в склейке (только Windows без WSL).** `render.js` пишет список частей видео в `out/parts.txt` в виде `file 'C:\...\part0.mp4'`. Если ffmpeg на шаге склейки падает с «Impossible to open» или «Invalid data», поправь в своей копии строку с `file '${p}'`: замени на `` `file '${p.replace(/\\/g, '/')}'` ``. В WSL этой проблемы нет.
- **Ловушка zsh** из скилла genvideo в bash не встречается, её можно пропустить.
- **Фоновые задачи.** Рендер дольше 2 минут запускай в фоне и не опрашивай результат в цикле, как сказано в скилле.
- **Удаление `tmp/`.** Последний шаг порядка работы в `CLAUDE.md` удаляет `tmp/`. Перед этим убедись, что нужные файлы уже перенесены в папку результатов.

## 6. Озвучка (ElevenLabs)

- **Коннектор.** Нужен коннектор ElevenLabs у пользователя. В claude.ai: Settings → Connectors. Или кастомный MCP: `https://api.elevenlabs.io/v1/mcp`. Без него скилл voice не сработает: скажи пользователю, а сам ничего не подключай.
- **Кредиты.** Одна озвучка на 1:50 моделью `eleven_v4` стоит около 1600 кредитов. Транскрибация бесплатная.
- **Голос.** В скилле voice указан `voice_id` `6YjFofyVXU1ASguf2hTJ` (Maxim). Если на аккаунте пользователя его нет, вызови `creative_list_voices`, предложи пользователю русский мужской разговорный голос и используй выбранный.

## 7. Чего здесь нет намеренно

- **Готовых роликов автора** (`render/ep1`, `render/ep2`, …) нет: это его исходники. Работай от `render/ep_template`, её достаточно. Ссылки на `ep1` в `CLAUDE.md` и скиллах необязательные.
- **Памяти о прошлых сериях** нет. Если ролик — продолжение, скилл nolan спросит сюжет предыдущей серии у пользователя.

## 8. Дальше

Когда разделы 2–4 пройдены, работай по `CLAUDE.md`, раздел «Порядок работы». Новый ролик начинается с копии заготовки: `cp -R render/ep_template render/epN`.
