# UI redesign TDD evidence

Sana: 2026-10-08  
Scope: TeamFlow frontend shell, public auth screens and shared visual tokens. Backend workflowlari o'zgartirilmadi.

## Qabul mezonlari

1. Klaviatura foydalanuvchisi `Tab` bilan skip-link orqali `#main-content` ga o'ta oladi.
2. Mobil foydalanuvchi menyuni ochadi, nomlangan parda yoki `Escape` bilan yopadi; yopiq menyu fokusni o'g'irlamaydi.
3. Tema tugmasi joriy dark/light holatini `aria-pressed` bilan bildiradi.
4. Kirish va landing oqimlarida semantik `main` landmark hamda skip-link mavjud.
5. Light/dark palitra ko'zga yumshoq, kontrasti yetarli va 375/768/1440px ekranlarda document overflow bermaydi.

## RED bosqichi

Package manager `frontend/package-lock.json` asosida npm deb aniqlandi.

Avval qo'shilgan testlar:

- `frontend/src/app/Layout.test.tsx` — 3 accessibility testi.
- `frontend/src/features/auth/AuthPages.test.tsx` — login `main` landmark testi.

`npm test -- --run src/app/Layout.test.tsx` natijasi: 3 testning 3 tasi kutilganidek yiqildi (skip-link, mobile menu close, `aria-pressed` mavjud emas edi).

`npm test -- --run src/features/auth/AuthPages.test.tsx` natijasi: 1 test yiqildi (login shell `div.auth-main` edi).

## GREEN bosqichi

Implementatsiyadan keyingi tekshiruvlar:

- `npm test`: 29 test fayli, 117 test passed.
- `npm run typecheck`: passed.
- `npx vite build`: passed; 2,000 modul transform qilindi.
- Browser QA: 14 check passed, 0 page error, 0 relevant 4xx/5xx issue; 375, 768 va 1440px, light/dark, login, dashboard, search dialog va mobile menu tekshirildi.
- Light kontrast: body 16.50:1, primary button 6.38:1.
- Dark kontrast: body 15.25:1, primary button 5.50:1.

Visual regression baseline repositoryda yo'q, shuning uchun pixel-level regression xulosasi **inconclusive**. Screenshotlar layout/overflow va qo'lda ko'rik uchun `.playwright-mcp/ui-redesign/` ichida saqlandi.

Git checkpoint commitlari yaratilmadi: foydalanuvchi commit so'ramagan va ishchi daraxtda mavjud `docs/PROJECT_PROMPT_UZ.md` untracked fayli saqlandi.

## 2026-10-29 follow-up: Admin login va boshqarma dashboard actionlari

### User journeys

- Administrator 320–1672px ekranlarda login sahifasini overflow va overlap’siz ishlatadi.
- Administrator password visibility, forgot-password guidance, keyboard focus va invalid-login error holatlarini tushunarli ko'radi.
- Boshqarma dashboard’i ortiqcha yuqori actionlar bilan chalg'itmaydi; buyurtma yaratishning empty-state flow'i saqlanadi.

### RED / GREEN evidence

| Guarantee | RED evidence | GREEN evidence |
|---|---|---|
| Admin login nested landmark va `javascript:void(0)` ishlatmaydi | Focused Django UI test yiqildi | `apps.core.tests.test_admin_ui`: 16/16 passed |
| Invalid admin login accessible error state beradi | Yangi error-state assertion yiqildi | Full backend: 410 passed, 2 skipped |
| Department dashboard screenshotdagi yuqori actionlarni ko'rsatmaydi | `DepartmentHome.test.tsx`: 1 failed | Targeted: 3/3 passed; full frontend: 151/151 passed |
| Mobile login 320/375px’da viewport’dan chiqmaydi | 320px’da input badge va flex centering muammosi kuzatildi | Browser metrics: `scrollWidth === clientWidth`; 320, 375, 768, 1672px tekshirildi |

### Commands

- `python manage.py test -v 1` — 410 passed, 2 skipped.
- `npm test` — 36 test files, 151 passed.
- `npm run typecheck` — passed.
- `npm run build` — passed.
- `git diff --check` — passed.

Visual baseline repositoryda yo'q; reference screenshot bilan qo'lda visual QA qilindi. Live `192.168.224.70:8020/admin/` sessiyasiz bo'lgani uchun login’ga redirect qildi; credential bilan mutating test bajarilmadi.
