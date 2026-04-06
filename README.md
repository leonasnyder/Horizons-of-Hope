# Horizons of Hope

Daily activity scheduler and behavioral data tracker for care providers. Runs fully offline as a Progressive Web App (PWA).

## Quick Start

```bash
npm install
npm run generate-icons   # generate PWA icons (requires canvas)
npm run dev              # start development server at http://localhost:3000
```

## Features

- **Scheduler** — Daily and weekly schedule views with drag-and-drop reordering, print support, and Word document export
- **Activity Manager** — Create and manage recurring activities with category tags and default time slots
- **Goal Tracker** — Track behavioral goals with subcategory responses (correct/incorrect/prompted)
- **Analytics** — Weekly streak tracking and accuracy charts per goal
- **Settings** — Configure schedule hours, staleness warnings, notification reminders, and appearance (light/dark/system)
- **Data Management** — Export/import all data as JSON; one-click clear

## Tech Stack

- **Next.js 14** (App Router, `'use client'` components)
- **SQLite** via `better-sqlite3` — single-file database, no external server required
- **Tailwind CSS** + shadcn/ui component library
- **@dnd-kit** — drag and drop for schedule reordering
- **docx** — client-side Word document generation
- **date-fns** — date formatting and arithmetic
- **recharts** — analytics charts
- **sonner** — toast notifications
- **next-themes** — dark/light/system theme switching
- **@ducanh2912/next-pwa** — PWA service worker and manifest

## Project Structure

```
app/
  layout.tsx          Root layout with TopNav and ThemeProvider
  page.tsx            Home (redirects to /scheduler)
  scheduler/          Scheduler page
  tracker/            Goal tracker page
  settings/           Settings page
  api/                All REST API routes
components/
  scheduler/          DayView, WeekView, ActivityManager, modals, print views
  tracker/            GoalList, GoalCard, ResponseModal, AnalyticsPanel
  shared/             DatePicker, CalendarWidget, ExportButtons
  ui/                 shadcn/ui primitives
lib/
  db.ts               SQLite database initialization and schema
  utils.ts            Shared utility functions
public/
  manifest.json       PWA manifest
  icons/              Generated app icons (192x192, 512x512)
scripts/
  generate-icons.js   Generates PNG icons using node-canvas
```

## Database

The SQLite database is created automatically at `horizons.db` in the project root on first run. No migrations needed — the schema is applied via `CREATE TABLE IF NOT EXISTS` on startup.

## PWA / iPad Usage

1. Open the app in Safari on iPad or iPhone
2. Tap the Share button → **Add to Home Screen**
3. The app will open in standalone mode (no browser chrome)
4. Notifications only fire while the app is open (iOS limitation)

## Building for Production

```bash
npm run build   # generates icons then builds Next.js
npm start       # start production server
```
