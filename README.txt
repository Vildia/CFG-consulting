PATCH: Fix border around the '03. Команда' step (Cyrillic 'сlass' -> Latin 'class').
This patch provides a minimal index.html section with correct class="step" for '03. Команда'.

Как применить (самый надёжный способ — правка строки вручную):
1) GitHub → ваш репозиторий → откройте 'index.html' (иконка карандаша 'Edit').
2) Найдите строку:
   <div сlass="step"><b>03. Команда</b>...
   (обратите внимание: первая буква в 'сlass' — кириллическая 'с').
3) Замените на:
   <div class="step"><b>03. Команда</b>...
4) Commit to 'main' и откройте сайт с параметром: ?v=class-fix

Если хотите загрузить этот файл как временную замену:
— 'Add file' → 'Upload files' → замените ваш 'index.html' на прилагаемый. Затем вручную верните остальной контент.
