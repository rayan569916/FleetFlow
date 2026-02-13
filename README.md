# FleetFlow Dashboard (Angular + Tailwind)

Production-style Angular dashboard implementation matching the provided logistics dashboard layout and behavior.

## Stack

- Angular 21 (standalone components, lazy route)
- Tailwind CSS (via PostCSS)
- RxJS service-based state handling
- SVG-driven interactive trends chart (Angular-compatible, no external chart dependency required)

## Folder Structure

```text
src/
├── app/
│   ├── core/
│   │   ├── constants/
│   │   └── models/
│   ├── shared/
│   │   └── ui/
│   ├── layout/
│   │   ├── dashboard-layout/
│   │   ├── header/
│   │   └── sidebar/
│   ├── dashboard/
│   │   ├── recent-activity/
│   │   ├── income-card/
│   │   ├── trends-chart/
│   │   └── drivers-list/
│   └── services/
```

## Implemented Components

- `SidebarComponent`: collapsible/expandable left nav, icon-only default, yellow icons, smooth transitions, mobile overlay mode
- `HeaderComponent`: top bar with hamburger toggle + scan barcode button
- `RecentActivityComponent`: fixed-height scrollable activity feed
- `IncomeCardComponent`: period dropdown (`Today/Week/Month/Year`), budget logic and dynamic value updates
- `TrendsChartComponent`: responsive yearly trend chart with interactive points/tooltip
- `DriversListComponent`: full-width responsive driver cards with status indicators
- `DashboardLayoutComponent`: enforces the required layout ratio `3:1:4` on desktop

## State & Data

- `DashboardDataService`: centralized mock API-style data streams for activity, income, trends, drivers
- `UiStateService`: sidebar expanded/collapsed state
- Typed interfaces in `src/app/core/models/dashboard.models.ts`
- Centralized constants in `src/app/core/constants/dashboard.constants.ts`

## Run

1. Install dependencies:

```bash
npm install
```

2. Start dev server:

```bash
npm start
```

3. Build:

```bash
npm run build
```

## Notes

- The workspace where this was generated had outbound npm network blocked, so dependency installation could not be executed in-session.
- Once `npm install` is run in a network-enabled environment, the project is ready to run.
