# Dough & Go

A playable 3D browser game inspired by the reference video's harvesting and pizza-making loop. All scene geometry is made in code; no assets from the reference game are used.

## Run

Requires Node.js 22.12+ (Node.js 24 recommended).

```sh
npm install
npm run dev
```

Open the local address printed by Vite. To try it on a phone, connect the phone to the same Wi-Fi and open the network address printed by Vite. The development server runs on all network interfaces.

The published game is at [akshaygore1.github.io/cook](https://akshaygore1.github.io/cook/). Pushing to `main` runs the Pages workflow, which builds the game with the `/cook/` asset path and publishes the generated `dist/` directory. The repository's Pages source must be **GitHub Actions**.

```sh
npm run build       # Type-check and produce dist/
npm run preview     # Preview the production build
```

## Play

- **WASD / arrow keys:** move relative to the screen.
- **Phone joystick:** drag to move.
- **Escape / pause button:** pause; the game also pauses when the tab is hidden or switched away.

Walk into wheat to harvest it automatically. Carry it to the golden pad next to the oven. Three wheat make one pizza. Pick up baked pizzas at the green pad, then serve them at the striped counter for $12 each. Spend coins on basket, oven, and movement upgrades. Serve ten pizzas to reach the first milestone, then keep playing.

Wheat regrows after 14 seconds. The kitchen holds 72 wheat and 24 prepared pizzas. Progress saves in this browser's local storage every two seconds and when leaving the page. There is no offline production. Sound is optional and starts muted. A new farm can be started from the pause menu with a confirmation.

## Project layout

- `src/model.ts`: simulation, inventory, baking, economy, save validation.
- `src/world.ts`: Three.js scene, procedural models, camera, effects.
- `src/main.ts`: interface, input, audio, persistence, animation loop.
- `src/style.css`: responsive interface and self-hosted fonts.
- `DESIGN.md`: the first playable's scope and visual direction.

Built with TypeScript, Three.js, and Vite. Requires WebGL. This is a local single-player prototype, with no accounts, server, multiplayer, ads, or in-app purchases.

Fonts: Fredoka and DM Sans, distributed through Fontsource under the SIL Open Font License. Licenses are included with their installed packages.
