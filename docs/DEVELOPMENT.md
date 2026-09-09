# Development and release guide

## Local workflow

1. Serve the repository: `python3 -m http.server 8000`.
2. Open `/`, then test all four gallery cards.
3. Keep browser developer tools open and confirm there are no console or network errors.
4. Test one desktop viewport, one narrow mobile viewport, keyboard-only navigation, and a device pixel ratio above 1.

## Maze Runner smoke test

- Start and pause from the overlay.
- Move with WASD and arrows; verify wall collision.
- Sprint until stamina drains and confirm it recovers at a time-based rate.
- Attack, change weapons with I, mute/unmute, and enter pointer lock with F.
- Confirm enemies damage the player and can be defeated.
- Reach the gold goal; confirm a new maze and incremented level.
- Resize and background the tab; confirm the game remains stable and pauses.
- On touch emulation, verify the D-pad and attack control.

## Code conventions

- Use relative asset paths and no third-party CDNs.
- Prefer `const`/`let` in new isolated demos; preserve compatible prototype style in the legacy raycaster unless refactoring a whole subsystem.
- Scale simulation by frame delta and cap large deltas.
- Cap DPR and dynamic object counts.
- Add an accessible name to controls and canvases.
- Respect `prefers-reduced-motion` for interface animation.

## Deployment

`.github/workflows/pages.yml` validates referenced local assets, then deploys the static repository to GitHub Pages on pushes to `main`, `master`, or `gh-pages`, and by manual dispatch. No generated output is committed.

## Suggested future work

- Split the raycaster into ES modules with unit-tested maze and ray math.
- Add deterministic seeded generation and shareable level URLs.
- Replace billboard reuse with dedicated enemy and portal artwork.
- Add optional quality presets and an FPS diagnostic panel.
- Run automated browser smoke tests with Playwright when a package toolchain is acceptable.
