# Playful.js Demos

A production-ready collection of dependency-free Canvas 2D experiments. The project is entirely static: no build step, runtime dependencies, cookies, analytics, or network requests.

[![Deploy to GitHub Pages](https://github.com/KetanDutt/playfuljs-demos/actions/workflows/pages.yml/badge.svg)](https://github.com/KetanDutt/playfuljs-demos/actions/workflows/pages.yml)

## Experiences

| Demo | Description | Controls |
| --- | --- | --- |
| [Maze Runner](./raycaster/) | Procedural pseudo-3D maze survival game | WASD/arrows, Shift, click, I, F, Esc |
| [Terrain](./terrain/) | Diamond-square isometric island generator | Select **New island** |
| [Gravity Field](./particles/) | Interactive luminous particle simulation | Point to attract, hold to repel |
| [Fountain](./particles2/) | Verlet physics fountain | Tap to move emitter; pause/resume |

## Highlights

- Responsive high-DPI rendering with capped pixel ratios
- Keyboard, mouse, touch, and pointer controls
- Procedural maze and terrain generation
- Synthesized Web Audio sound effects (no audio downloads)
- Pause-on-hidden behavior and reduced-motion-aware UI
- Accessible labels, semantic overlays, and mobile-safe layouts
- Zero third-party dependencies

## Run locally

Static files should be served over HTTP:

```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

There is no install or build command. Changes appear after a refresh.

## Project layout

```text
index.html             Demo gallery
raycaster/             Maze Runner game, styles, scripts, and assets
terrain/               Procedural terrain demo
particles/             Interactive gravity particles
particles2/            Particle fountain
docs/                   Architecture, gameplay, and development notes
.github/workflows/      GitHub Pages deployment and static checks
```

See [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) for testing and contribution guidance, [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for implementation details, and [`docs/GAMEPLAY.md`](docs/GAMEPLAY.md) for the game guide.

## Browser support

Current evergreen versions of Chrome, Edge, Firefox, and Safari are supported. Pointer Lock and Web Audio enhance Maze Runner but are not required. Touch controls appear on coarse-pointer devices.

## License

[MIT](LICENSE)
