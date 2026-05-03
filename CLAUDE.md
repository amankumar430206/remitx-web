# CLAUDE.md — RemitX Web

## Project

White-label cross-border payment platform — React web frontend.
API lives at remitx-api/. Reference docs in parent folder (../01_PRD.md etc.)

## CURRENT_PHASE: 11A

## Stack

React 18 · TypeScript · Vite · TanStack Query · Zustand
React Hook Form + Zod · Tailwind CSS · Radix UI · Recharts
Socket.io-client · React Router v6 · Axios

## Absolute Rules

1. Zero inline styles — Tailwind only
2. Zero hardcoded colors — CSS variables (var(--color-\*)) only
3. Desktop = TopNav only, NO sidebar ever
4. Mobile ≤768px = hamburger drawer sidebar
5. Every data fetch = custom hook in src/hooks/
6. Every form = React Hook Form + Zod
7. All API calls in src/api/{module}.ts
8. DataTable is the ONLY table component — never build another
9. PageHeader on EVERY page
10. Only import from src/components/ui/ — build no one-off primitives

## Phase

Read ../02_PHASES.md Phase 11A-11E for specs.
Read ../01_PRD.md Section 9 for design system + screen inventory.
Read ../03_TECHNICAL_REFERENCE.md Sections 15-16 for React patterns.
