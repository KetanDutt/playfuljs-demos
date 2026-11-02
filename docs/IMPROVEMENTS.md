# Improvement notes

## Current pass

- Corrected melee attacks through walls, map boundary collision, sprite angle wrapping, and repeated pointer-lock listeners.
- Stopped wall rays at the first hit, removed unused per-ray random work, and fixed rectangular shading over transparent sprites.
- Added a distinct beacon, touch sprint and weapon switching, particle-field pause, and clearer sound state. Pausing now releases pointer lock and clears held input.
- Added regression checks and integrated them into the existing Pages validation workflow.

## Recommended next steps

- Add browser-based integration and visual tests for pointer lock, audio, touch, and responsive layouts when a browser test toolchain is acceptable.
- Introduce deterministic seeds so maze generation can be reproduced and tested more thoroughly.
- Test and tune enemy pathfinding and game balance with players; enemies currently chase directly and can get caught on walls.
- Evaluate alternate input methods for the pointer-driven particle demos, and test the game with assistive technology. Canvas visuals are not a complete nonvisual experience.
- Consider optional graphics and motion settings, including alternatives to continuously animated canvas content.
