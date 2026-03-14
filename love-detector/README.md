# 恋爱测谎仪 (Love Lie Detector)

A mobile-first Next.js app for detecting lies in romantic relationships using interactive questioning and AI-simulated credibility analysis.

## Features

- Verification code access system (sold via Xianyu / Xiaohongshu)
- Three testing modes: 测TA / 测自己 / 微信测谎
- 20 questions across 5 categories and 3 difficulty levels
- Real-time animated credibility analysis
- Detailed result reports with AI advice
- Share and save report functionality

## Local Development

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd love-detector

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your codes and secret

# 4. Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create a `.env.local` file (never commit this):

```env
# Comma-separated valid access codes
VALID_CODES=LLD-LOVE-2024,LLD-TEST-001,LLD-DEMO-888

# Secret for token generation (use a long random string)
TOKEN_SECRET=your-very-long-random-secret-here
```

## Default Test Codes

The app ships with three demo codes that work without any `.env.local`:
- `LLD-DEMO-888`
- `LLD-TEST-001`
- `LLD-LOVE-2024`

Remove these defaults by setting your own `VALID_CODES` in production.

## Deploying to Vercel

1. Push your code to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Add environment variables in the Vercel project settings:
   - `VALID_CODES` — your comma-separated code list
   - `TOKEN_SECRET` — a long random secret string
4. Deploy!

```bash
# Or deploy via CLI
npx vercel --prod
```

## Managing Verification Codes

Codes are stored as a comma-separated `VALID_CODES` environment variable.

**To add new codes:**
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Edit the `VALID_CODES` value, append your new codes separated by commas
3. Redeploy (or the change takes effect on next deployment)

**Code format recommendation:** `LLD-XXXX-XXXX` (e.g., `LLD-STAR-2024`)

## Selling Codes

### Xiaohongshu (小红书)
1. Post a note with screenshots of the app
2. Title: "恋爱测谎仪 | 测出 TA 说的是不是真话 💕"
3. In comments/DMs, send the code after payment via
   Xiaohongshu's built-in shop or WeChat Pay

### Xianyu (闲鱼)
1. List the item as a virtual product
2. Description: "恋爱测谎仪验证码，购买后立即发送，永久有效"
3. After payment, send the unique code via Xianyu chat

**Tips:**
- Use a unique code per buyer so you can revoke individual codes if needed
- Keep a spreadsheet of code → buyer mapping
- Price range: ¥9.9 – ¥29.9 works well for this type of app

## Tech Stack

- [Next.js 14](https://nextjs.org/) (App Router)
- [Tailwind CSS v3](https://tailwindcss.com/)
- TypeScript
- No database — localStorage for state, env vars for codes

## Project Structure

```
love-detector/
├── app/
│   ├── (protected)/        # Auth-guarded routes
│   │   ├── home/           # Main home page
│   │   ├── setup/          # Test configuration
│   │   ├── test/           # Active test session
│   │   ├── wechat/         # WeChat record analysis
│   │   └── result/         # Results report
│   ├── api/verify/         # Code verification API
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx            # Landing/verify page
├── components/
│   ├── MobileWrapper.tsx
│   ├── StatusBar.tsx
│   └── TabBar.tsx
├── lib/
│   ├── auth.ts
│   └── questions.ts
└── ...
```

## License

Private / Commercial use only.
