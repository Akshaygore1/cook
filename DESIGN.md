# Dough & Go

A playable, original take on the reference video's wheat-to-pizza loop.

## First playable

Walk into a golden wheat patch to harvest automatically. Bundles stack visibly on the character's back, up to a carrying limit. Stand on the kitchen delivery pad to unload. The oven uses three wheat per pizza, and cooked pizzas collect at a pickup pad. Carry pizzas to a waiting customer to earn coins. Spend coins on a larger backpack, faster oven, or faster movement. Wheat regrows so the loop can continue.

The first milestone is ten pizzas served. Continue playing and upgrading after reaching it. Save coins, upgrades, ingredients, and progress locally between visits.

## Art direction

Visual thesis: a sunny, tactile miniature farm and pizzeria, with soft shadows, rounded toy characters, and satisfying stacks of wheat and pizzas.

Palette: tomato `#E65337`, wheat `#F4C45B`, leafy green `#8EAF65`, kitchen teal `#397E7C`, flour `#FFF6E3`, ink `#293B32`.

Typography: a rounded, friendly display face for the game name and a clean sans serif for counters and instructions. The world is the dominant visual; the interface stays small and readable.

Composition: full-screen isometric world. The wheat field, oven, and customer counter are physically distinct and connected by a clear walking route. The opening screen has a single play action. During play, show money, carrying capacity, the current objective, and upgrades.

Signature: harvesting builds a comically tall stack on the character's back. Materials visibly travel into the kitchen and pizzas travel to customers.

Interaction thesis: a camera transition from the opening diorama into play; springy pickups and coin bursts; character walk animation and a subtle field sway. Respect reduced-motion preferences for interface transitions and optional effects.

## Controls and verification

Keyboard movement with WASD or arrow keys; touch joystick on phones. Proximity triggers harvesting, unloading, pickup, and selling automatically. Pause and sound controls remain accessible.

Verify a complete harvest → unload → bake → collect → sell cycle, insufficient-funds handling, upgrades, save/load, pause, and desktop/mobile layouts. No copied game assets are needed.

## Open-world expansion

The next stage extends the same miniature world along an open walking lane. The new field is visible before purchase, with a sign and coin price. Entering a ring reveals an explicit Buy/Hire button; E is the keyboard shortcut. Proximity alone never spends coins, and purchases require sufficient funds. The recommended progression is pizza worker → wheat farm → farm worker, but farm ownership is not gated by the first milestone or the pizza worker.

The teal pizza worker collects and carries up to six pizzas to the counter. The green farm worker with a straw hat harvests the purchased field and delivers up to 18 wheat along the front lane. Their jobs and carrying inventories remain separate. Purchases are permanent, and worker cargo survives reloads. Neither worker produces while paused or offline.

Four customers cycle through arrival, queueing, receiving a pizza, departing with a compliment, and returning. Only a customer at the front of the queue can be served. Waiting has no penalty. The decorative looping car and outdoor dining furniture are removed. Finished pizzas visibly slide from the oven mouth down a short ramp before becoming available at pickup.

World labels use fixed widths and composited, device-pixel-aligned anchors after camera rendering. The oven progress fill updates each rendered frame; HUD backgrounds do not blur scenery moving behind them. Reduced-motion mode suppresses limb sway, smoke, celebratory particles, item flights, and decorative pulses while retaining readable production states.
