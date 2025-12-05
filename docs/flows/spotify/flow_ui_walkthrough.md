# Spotify Flow UI Walkthrough

This document describes the modern **Svelte 5 UI** that works in tandem with the Elysia backend to visualize your Spotify Liked Songs.

## Launching the Application

The project is a monorepo managed by **pnpm**. To start the full stack (Backend + UI):

```bash
pnpm dev
```

- **Backend**: `http://localhost:4173` (Elysia API)
- **Frontend**: `http://localhost:5173` (Svelte 5 + Vite)

## Features

### 1. The Dashboard (Spotify Flow)
Navigate to `#/spotify` to see your collection.
- **Sync**: Click "Sync with Spotify" to fetch the latest tracks.
- **Infinite Scroll**: Scroll down to automatically load more tracks (no paging buttons!).
- **Visuals**: High-resolution album art, clear typography, and glassmorphism design.

### 2. Filters & Search
The **Filter Panel** allows deep exploration:
- **Search**: Real-time filtering by title, artist, or album.
- **Genre**: Filter by specific genres (e.g., "Pop", "Rock").
- **Year**: Filter by release year.
- **Sorting**: Order by Date Added, Popularity, or Release Date.
- **Sliders**: Filter by popularity range.

### 3. Insights (Charts) 📊
Visualize your data with interactive charts:
- **Genre Distribution**: A doughnut chart showing your top 6 genres.
- **Eras (Timeline)**: A bar chart showing the distribution of your music across decades (60s, 70s... 2020s).

## Architecture

The UI is built with:
- **Svelte 5**: Utilizing Runes (`$state`, `$derived`, `$effect`) for reactivity.
- **Tailwind CSS 4**: For modern, utility-first styling.
- **Chart.js**: For rendering data visualizations.
- **Vite**: For lightning-fast HMR and building.
