export type Upgrade = 'basket' | 'oven' | 'shoes';
export type Point = { x: number; z: number };
export type GameEvent = { type: 'harvest' | 'deposit' | 'baked' | 'pickup' | 'sale' | 'upgrade' | 'milestone'; x: number; z: number; amount?: number };
export type Crop = Point & { readyAt: number };
export type SaveData = {
  version: 1;
  coins: number;
  served: number;
  harvested: number;
  grain: number;
  pizzas: number;
  ovenWheat: number;
  readyPizzas: number;
  bakeProgress: number;
  levels: Record<Upgrade, number>;
  position: Point;
};

export const STATIONS = {
  delivery: { x: 0.3, z: -3.2 },
  pickup: { x: 5.1, z: -1.4 },
  counter: { x: 7.3, z: 4.2 },
};
export const FIELD = { left: -10.8, right: -2.8, back: -6.9, front: 2.1 };
export const UPGRADE_PRICES: Record<Upgrade, number[]> = {
  basket: [36, 90, 180], oven: [48, 120, 220], shoes: [36, 90, 180],
};
export const OBSTACLES = [
  { left: 1.8, right: 7.0, back: -6.7, front: -3.0 },
  { left: -0.8, right: 1.5, back: -6.7, front: -4.55 },
  { left: 5.45, right: 9.5, back: 5.4, front: 6.7 },
];
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
const bounded = (value: unknown, maximum: number, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(maximum, Math.floor(value))) : fallback;

export function readSave(raw: string | null): SaveData | undefined {
  if (!raw) return;
  try {
    const value = JSON.parse(raw);
    if (!value || value.version !== 1 || !value.levels) return;
    const levels = { basket: bounded(value.levels.basket, 3), oven: bounded(value.levels.oven, 3), shoes: bounded(value.levels.shoes, 3) };
    const capacity = 18 + levels.basket * 9;
    const grain = bounded(value.grain, capacity);
    return {
      version: 1, levels, coins: bounded(value.coins, 9999999), served: bounded(value.served, 999999),
      harvested: bounded(value.harvested, 9999999), grain, pizzas: bounded(value.pizzas, capacity - grain),
      ovenWheat: bounded(value.ovenWheat, 72), readyPizzas: bounded(value.readyPizzas, 24),
      bakeProgress: typeof value.bakeProgress === 'number' ? Math.max(0, Math.min(1, value.bakeProgress)) || 0 : 0,
      position: { x: -0.8, z: 3.5 },
    };
  } catch { return; }
}

export class Game {
  state: SaveData;
  crops: Crop[] = [];
  events: GameEvent[] = [];
  elapsed = 0;
  moving = false;
  private harvestCooldown = 0;
  private stationCooldown = 0;

  constructor(saved?: SaveData) {
    this.state = saved ?? {
      version: 1, coins: 0, served: 0, harvested: 0, grain: 0, pizzas: 0, ovenWheat: 0,
      readyPizzas: 0, bakeProgress: 0, levels: { basket: 0, oven: 0, shoes: 0 }, position: { x: -0.8, z: 3.5 },
    };
    for (let row = 0; row < 12; row++) {
      for (let col = 0; col < 11; col++) {
        this.crops.push({ x: FIELD.left + .35 + col * .74, z: FIELD.back + .35 + row * .75, readyAt: 0 });
      }
    }
  }

  get capacity() { return 18 + this.state.levels.basket * 9; }
  get load() { return this.state.grain + this.state.pizzas; }
  get speed() { return 4.5 + this.state.levels.shoes * .65; }
  get bakeTime() { return [2.8, 2.1, 1.5, 1][this.state.levels.oven]; }
  get full() { return this.load >= this.capacity; }

  price(upgrade: Upgrade) { return UPGRADE_PRICES[upgrade][this.state.levels[upgrade]] ?? null; }

  buy(upgrade: Upgrade) {
    const price = this.price(upgrade);
    if (price === null || this.state.coins < price) return false;
    this.state.coins -= price;
    this.state.levels[upgrade]++;
    this.events.push({ type: 'upgrade', ...this.state.position });
    return true;
  }

  step(dt: number, direction: Point = { x: 0, z: 0 }) {
    dt = Math.max(0, Math.min(dt, .1));
    this.elapsed += dt;
    this.harvestCooldown = Math.max(0, this.harvestCooldown - dt);
    this.stationCooldown = Math.max(0, this.stationCooldown - dt);
    this.move(direction, dt);
    const s = this.state;

    if (!this.full && this.harvestCooldown === 0) {
      const crop = this.crops.find(crop => crop.readyAt <= this.elapsed && distance(crop, s.position) < 1.05);
      if (crop) {
        crop.readyAt = this.elapsed + 14;
        s.grain++;
        s.harvested++;
        this.harvestCooldown = .075;
        this.events.push({ type: 'harvest', x: crop.x, z: crop.z });
      }
    }

    if (this.stationCooldown === 0) {
      if (distance(s.position, STATIONS.delivery) < 1.35 && s.grain > 0 && s.ovenWheat < 72) {
        s.grain--; s.ovenWheat++;
        this.stationCooldown = .09;
        this.events.push({ type: 'deposit', ...STATIONS.delivery });
      } else if (distance(s.position, STATIONS.pickup) < 1.4 && s.readyPizzas > 0 && !this.full) {
        s.readyPizzas--; s.pizzas++;
        this.stationCooldown = .2;
        this.events.push({ type: 'pickup', ...STATIONS.pickup });
      } else if (distance(s.position, STATIONS.counter) < 1.6 && s.pizzas > 0) {
        s.pizzas--; s.served++; s.coins += 12;
        this.stationCooldown = .42;
        this.events.push({ type: 'sale', ...STATIONS.counter, amount: 12 });
        if (s.served === 10) this.events.push({ type: 'milestone', ...s.position });
      }
    }

    if (s.ovenWheat >= 3 && s.readyPizzas < 24) {
      s.bakeProgress += dt / this.bakeTime;
      if (s.bakeProgress >= 1) {
        s.bakeProgress -= 1; s.ovenWheat -= 3; s.readyPizzas++;
        this.events.push({ type: 'baked', ...STATIONS.pickup });
      }
    }
  }

  private move(input: Point, dt: number) {
    const length = Math.hypot(input.x, input.z);
    this.moving = length > .01;
    if (!this.moving) return;
    const amount = this.speed * dt / Math.max(1, length);
    const position = this.state.position;
    const allowed = (x: number, z: number) => !OBSTACLES.some(b => x > b.left - .32 && x < b.right + .32 && z > b.back - .32 && z < b.front + .32);
    const x = Math.max(-12.1, Math.min(12.1, position.x + input.x * amount));
    if (allowed(x, position.z)) position.x = x;
    const z = Math.max(-8.1, Math.min(8.1, position.z + input.z * amount));
    if (allowed(position.x, z)) position.z = z;
  }

  get objective(): { title: string; detail: string; target: Point; step: number } {
    const s = this.state;
    if (s.pizzas > 0) return { title: 'Fresh pizza, coming through!', detail: 'Take your pizzas to the striped counter.', target: STATIONS.counter, step: 3 };
    if (s.grain > 0 && (this.full || distance(s.position, STATIONS.delivery) < 2.5)) return { title: 'Time to make some dough', detail: 'Stand on the wheat pad to fill the oven.', target: STATIONS.delivery, step: 1 };
    if (s.readyPizzas > 0 && !this.full) return { title: 'Hot out of the oven', detail: 'Collect your pizzas at the green pad.', target: STATIONS.pickup, step: 2 };
    if (s.ovenWheat >= 3 && s.grain === 0) return { title: 'Good things take a little time', detail: 'Your pizza is baking. Harvest more or wait by the oven.', target: STATIONS.pickup, step: 2 };
    if (s.grain > 0) return { title: 'A little more wheat', detail: 'Fill your basket, then head to the kitchen.', target: { x: -6.4, z: -.5 }, step: 0 };
    return { title: s.served ? 'Let’s make another batch' : 'Every pizza starts in the field', detail: 'Walk into the wheat. We’ll take care of the harvesting.', target: { x: -6.4, z: -.5 }, step: 0 };
  }
}
