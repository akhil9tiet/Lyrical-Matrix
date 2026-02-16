<div align="center">
<img width="1200" height="475" alt="Lyrical Matrix Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# Lyrical Matrix

**Uncover the repetition patterns and structures hidden within your favorite songs.**

[![Deploy to GitHub Pages](https://github.com/akhil/Lyrical-Matrix/actions/workflows/deploy.yml/badge.svg)](https://github.com/akhil/Lyrical-Matrix/actions/workflows/deploy.yml)

</div>

## About

Lyrical Matrix is a web app that visualizes word repetition in song lyrics as an interactive heatmap. Search for any song, and the app fetches its lyrics, analyzes word frequency, and renders a matrix showing how words repeat throughout the track.

## Features

- **Lyrics Fetching** — Retrieves lyrics via the [lyrics.ovh](https://lyrics.ovh) API
- **Song Metadata** — Pulls album artwork, artist info, release year, and audio previews from the iTunes API
- **Repetition Heatmap** — Generates a D3-powered matrix visualization of word frequency and position
- **Music Player** — Listen to a 30-second preview of the track while exploring the visualization
- **Poster Export** — Download the heatmap as a high-resolution poster image
- **Instagram Sharing** — Share the poster directly to Instagram via the Web Share API (mobile) or clipboard (desktop)
- **Claymorphism UI** — Soft, neumorphic design with smooth animations

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** — Build tooling and dev server
- **D3.js** — Heatmap visualization
- **Tailwind CSS** (CDN) — Styling
- **html-to-image** — Poster generation

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (or npm/yarn)

### Installation

```bash
git clone https://github.com/akhil/Lyrical-Matrix.git
cd Lyrical-Matrix
pnpm install
```

### Development

```bash
pnpm run dev
```

The app will be available at `http://localhost:3000`.

### Build

```bash
pnpm run build
```

### Preview Production Build

```bash
pnpm run preview
```

## Deployment

The project includes a GitHub Actions workflow that automatically builds and deploys to GitHub Pages on every push to `main`.

To enable it:
1. Go to your repo's **Settings → Pages**
2. Set the source to **GitHub Actions**

## Project Structure

```
├── App.tsx                  # Main app component
├── index.html               # HTML entry point
├── index.tsx                # React entry point
├── types.ts                 # TypeScript type definitions
├── constants.ts             # App constants
├── vite.config.ts           # Vite configuration
├── components/
│   ├── Header.tsx           # App header
│   ├── SearchForm.tsx       # Song search input
│   ├── Heatmap.tsx          # D3 heatmap visualization
│   ├── MusicPlayer.tsx      # Audio preview player
│   └── SnapshotButton.tsx   # Download & Instagram share
├── services/
│   ├── itunesService.ts     # iTunes API integration
│   └── lyricsService.ts     # Lyrics fetching
└── utils/
    └── textAnalyzer.ts      # Word frequency analysis
```

## License

This project is open source and available under the [MIT License](LICENSE).
