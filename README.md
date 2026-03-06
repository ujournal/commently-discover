# Commently Discover

Cloudflare Worker для отримання прев’ю посилань (unfurl/embed). Обробляє запити з URL і повертає HTML-ембеди для соцмереж та платформ.

## Що робить воркер

- **Ембеди посилань** — за параметром `?url=...` або за base64-шляхом повертає HTML для вбудовування поста/відео з підтримуваних платформ.
- **Підтримувані платформи**: Twitter/X, Facebook, Instagram, Reddit, Steam, Telegram, Threads, TikTok.
- **Додатково**: віддає `favicon.ico`, `robots.txt`, кешує відповіді.
- **Мова**: можна задати через `?lang=uk` або заголовок `Accept-Language`.

## Як задеплоїти воркер

### Передумови

- [Node.js](https://nodejs.org/) (рекомендовано LTS)
- обліковий запис [Cloudflare](https://dash.cloudflare.com/sign-up) та налаштований [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

### Кроки

1. **Клонувати репозиторій і встановити залежності:**

   ```bash
   git clone <url-репозиторію> commently-discover
   cd commently-discover
   npm install
   ```

2. **Увійти в Cloudflare через Wrangler** (якщо ще не залогінені):

   ```bash
   npx wrangler login
   ```

3. **Задеплоїти воркер:**

   ```bash
   npm run deploy
   ```

   Або напряму:

   ```bash
   npx wrangler deploy
   ```

4. Після деплою воркер буде доступний за адресою виду  
   `https://commently-discover.<ваш-піддомен>.workers.dev` (або ваш власний домен, якщо налаштований у Cloudflare).

### Локальна розробка

```bash
npm run dev
```

Запускається локальний сервер для тестування (зазвичай `http://localhost:8787`).

### Конфігурація

Основні налаштування — у файлі `wrangler.jsonc`: ім’я воркера, compatibility date, статичні ассети (`assets`). Для секретів використовуйте:

```bash
npx wrangler secret put SECRET_NAME
```

Детальніше: [документація Wrangler](https://developers.cloudflare.com/workers/wrangler/configuration/).
