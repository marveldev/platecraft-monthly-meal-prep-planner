# PlateCraft – Monthly Meal Prep Planner

PlateCraft plans an entire month of meals from your own food list. It auto-balances breakfast, lunch, dinner, and even adds tasteful dessert suggestions when you do not have any. Built by [Teda.dev](https://teda.dev), the AI app builder for everyday problems, this app focuses on a delightful experience with smooth exports and a print-ready layout.

## Features
- Add foods to your personal library by category
- Auto-generate a 4-week (28-day) meal plan
- Smart balancing to avoid boring repeats
- Default dessert suggestions are included when your list has none
- Week and month views with quick editing per day
- Export current week or full month to CSV, export month to JSON
- Print-friendly pages with weekly break layout
- All data is saved in localStorage so your progress survives reloads

## Tech Stack
- HTML5 + Tailwind CSS (CDN)
- jQuery 3.7.x
- Modular JavaScript with a single global namespace window.App

## Project Structure
- index.html – Landing page
- app.html – Main application interface
- styles/main.css – Custom CSS and print styles
- scripts/helpers.js – Utility functions, storage, planning engine
- scripts/ui.js – UI rendering and event handling (defines App.init and App.render)
- scripts/main.js – App entry point that loads after helpers and ui

## Usage
1. Open index.html and click Launch planner, or open app.html directly.
2. Add foods or tap sample foods.
3. Click Generate month to create your plan.
4. View by week or month. Click a day to edit meals.
5. Export CSV/JSON or print using the header Print button.

## Data Persistence
All foods, settings, and your generated plan are stored on your device using localStorage under namespaced keys.

## Accessibility
- Semantic markup and labeled controls
- Keyboard navigable buttons and modal
- High-contrast print layout
- Respects prefers-reduced-motion

## Notes
- PDF export is supported via your browser: choose Print and Save as PDF.
- The month is standardized to 28 days for a clean 4-week grid.
