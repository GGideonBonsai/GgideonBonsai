# Gideon Bonsai 義典 — Supabase Edition

PWA приложение с Supabase (база данных + хранилище фото) и GitHub Pages.

## Структура

```
gideon-bonsai/
├── index.html              — главная страница + экран авторизации
├── manifest.json           — PWA манифест
├── sw.js                   — Service Worker (офлайн + уведомления)
├── supabase-schema.sql     — SQL для создания таблиц (выполнить 1 раз)
├── css/style.css           — все стили
└── js/
    ├── supabase.js         — весь Supabase API (БД + фото + авторизация)
    ├── app.js              — точка входа, авторизация, навигация
    ├── render.js           — отрисовка UI
    └── modals.js           — логика модальных окон
```

## Настройка (10 минут)

### 1. Создать проект Supabase
- Зайдите на https://supabase.com → Sign Up (бесплатно)
- New Project → придумайте название и пароль
- Подождите ~1 минуту пока проект создаётся

### 2. Скопировать ключи
В Supabase: Settings → API
- Скопируйте **Project URL** (https://xxxx.supabase.co)
- Скопируйте **anon public key**

### 3. Вставить в код
Откройте `js/supabase.js`, замените первые две строки:
```js
export const SUPABASE_URL = 'https://xxxx.supabase.co';
export const SUPABASE_KEY = 'ваш-anon-key';
```

### 4. Создать таблицы
В Supabase: SQL Editor → New Query → вставьте содержимое `supabase-schema.sql` → Run

### 5. Создать хранилище фото
В Supabase: Storage → New Bucket
- Name: `photos`
- Public bucket: ВКЛ (чтобы фото отображались)

### 6. Включить Google авторизацию (опционально)
В Supabase: Authentication → Providers → Google → Enable
- Нужен Google OAuth Client ID (из Google Cloud Console)
- Или используйте вход по email — работает сразу

### 7. Деплой на GitHub Pages
- Создайте репозиторий на GitHub
- Загрузите все файлы
- Settings → Pages → Source: main branch
- Сайт: https://username.github.io/repo-name

### 8. Добавить URL в Supabase
В Supabase: Authentication → URL Configuration
- Site URL: https://username.github.io/repo-name
- Redirect URLs: добавьте тот же URL

## Использование

- Откройте сайт → зарегистрируйтесь или войдите
- Все данные автоматически синхронизируются через Supabase
- Фото загружаются в Supabase Storage
- Работает на телефоне и компьютере одновременно
- Push-уведомления через кнопку 💾 → 🔔

## Бесплатный план Supabase включает
- 500MB база данных
- 1GB хранилище файлов (фото)
- 50,000 активных пользователей в месяц
- Достаточно для личной коллекции
