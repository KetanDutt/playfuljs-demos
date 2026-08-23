# Browser Demos

This repository contains four small experiments/demos.

## Demos

1. **Raycaster (`/raycaster`)**: A pseudo-3D Wolfenstein-style engine using raycasting on a 2D HTML5 canvas. Features fullscreen, pointerlock, weapon bobbing, and some basic enemies.
2. **Terrain (`/terrain`)**: An isometric 3D terrain generator using the diamond-square algorithm to create mountainous landscapes dynamically.
3. **Particles (`/particles`)**: A basic 2D particle system demonstrating integration, velocity, and mouse attraction forces.
4. **Particle Fountain (`/particles2`)**: A physics-based particle fountain demonstrating gravity, bouncing logic, and overlay composition.

## Running Locally

Because some demos load assets (images, textures) via JavaScript, you may need a local web server to avoid CORS issues.

1. Clone or download the repository.
2. Open a terminal in the project directory.
3. Start a local server. If you have Python installed, you can run:
   - `python -m http.server` (Python 3)
   - `python -m SimpleHTTPServer` (Python 2)
4. Open your browser and navigate to `http://localhost:8000/raycaster` (or any other demo folder).

## Contributing

To extend a demo, just fork this repository.

Once you fork this repo and push to your own gh-pages branch, your work will be accessible at a url like `http://[username].github.io/browser-demos/raycaster`.
