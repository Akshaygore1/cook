export type Upgrade = "basket" | "oven" | "shoes";
export type Purchase = "server" | "farm" | "farmer";
export type Point = { x: number; z: number };
export type GameEvent = {
  type:
    | "harvest"
    | "deposit"
    | "baked"
    | "pickup"
    | "sale"
    | "tip"
    | "customer_lost"
    | "rush_up"
    | "upgrade"
    | "milestone";
  x: number;
  z: number;
  amount?: number;
  actor?: "player" | "server" | "farmer";
  customer?: number;
};
export type Crop = Point & { readyAt: number; expansion: boolean };
export type Worker = { position: Point; heading: number; moving: boolean; cooldown: number; delivering: boolean };
export type CustomerMood = "neutral" | "happy" | "impatient" | "angry";
export type Customer = {
  id: number;
  position: Point;
  heading: number;
  moving: boolean;
  mode: "arriving" | "waiting" | "leaving" | "away";
  order: number;
  wait: number;
  compliment: string;
  patience: number;
  maxPatience: number;
  neededPizzas: number;
  servedPizzas: number;
  mood: CustomerMood;
};
export type SaveData = {
  version: 2;
  farmOwned: boolean;
  workers: { server: boolean; farmer: boolean };
  cargo: { server: number; farmer: number };
  outputProgress: number;
  coins: number;
  served: number;
  lost: number;
  streak: number;
  harvested: number;
  grain: number;
  pizzas: number;
  ovenWheat: number;
  readyPizzas: number;
  bakeProgress: number;
  levels: Record<Upgrade, number>;
  position: Point;
};

export type RushStage = {
  stage: number;
  name: string;
  badge: string;
  minServed: number;
  maxQueue: number;
  patience: number;
  arrivalCooldown: number;
  multiPizzaProb: number;
};

export const RUSH_STAGES: RushStage[] = [
  { stage: 1, name: "Warmup Morning", badge: "Warmup", minServed: 0, maxQueue: 2, patience: 36, arrivalCooldown: 4.0, multiPizzaProb: 0 },
  { stage: 2, name: "Neighborhood Buzz", badge: "Busy", minServed: 5, maxQueue: 3, patience: 28, arrivalCooldown: 2.8, multiPizzaProb: 0.25 },
  { stage: 3, name: "Lunch Rush", badge: "Rush!", minServed: 12, maxQueue: 4, patience: 22, arrivalCooldown: 2.0, multiPizzaProb: 0.45 },
  { stage: 4, name: "Dinner Frenzy", badge: "Frenzy!", minServed: 25, maxQueue: 5, patience: 18, arrivalCooldown: 1.5, multiPizzaProb: 0.65 },
  { stage: 5, name: "Pizzeria Craze", badge: "Craze!", minServed: 45, maxQueue: 6, patience: 15, arrivalCooldown: 1.2, multiPizzaProb: 0.8 },
];

export const BASKET_CAPACITIES = [18, 27, 38, 54, 72];
export const OVEN_TIMES = [2.8, 2.0, 1.4, 0.9, 0.6];
export const SHOE_SPEEDS = [4.5, 5.2, 6.0, 7.0, 8.0];

export const STATIONS = {
  delivery: { x: 0.3, z: -3.2 },
  pickup: { x: 5.1, z: -1.4 },
  counter: { x: 7.3, z: 4.2 },
};
export const FIELD = { left: -10.8, right: -2.8, back: -6.9, front: 2.1 };
export const EXTRA_FIELD = { left: -23, right: -13.6, back: -6.9, front: 2.1 };
export const PURCHASES = {
  server: { x: 2.5, z: 3.6, price: 96, title: "Hire pizza worker", detail: "Collects pizzas and serves your customers." },
  farm: { x: -12.6, z: 3.8, price: 180, title: "Buy wheat farm", detail: "More wheat, more room to grow." },
  farmer: { x: -18.3, z: 3.8, price: 144, title: "Hire farm worker", detail: "Harvests your new farm and fills the oven." },
};
export const QUEUE_FRONT = { x: 7.3, z: 7.65 };
const compliments = ["Best pizza in town!", "Worth the walk!", "That crust!", "Fresh from the farm!", "See you tomorrow!", "Super speedy service!", "Pure perfection!"];
const angryQuotes = ["Too slow! 😠", "I can't wait forever!", "Starving here! ⏳", "Gotta run! 💨", "Terrible wait! 😤"];
export const UPGRADE_PRICES: Record<Upgrade, number[]> = {
  basket: [36, 90, 180, 320],
  oven: [48, 120, 220, 380],
  shoes: [36, 90, 180, 300],
};
export const OBSTACLES = [
  { left: 1.8, right: 7.0, back: -6.7, front: -3.0 },
  { left: -0.8, right: 1.5, back: -6.7, front: -4.55 },
  { left: 3.0, right: 6.4, back: -3.5, front: -2.45 },
  { left: 5.45, right: 9.5, back: 5.4, front: 6.7 },
];
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.z - b.z);
const bounded = (value: unknown, maximum: number, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(maximum, Math.floor(value)))
    : fallback;

export function readSave(raw: string | null): SaveData | undefined {
  if (!raw) return;
  try {
    const value = JSON.parse(raw);
    if (!value || (value.version !== 1 && value.version !== 2) || !value.levels) return;
    const levels = {
      basket: bounded(value.levels.basket, 4),
      oven: bounded(value.levels.oven, 4),
      shoes: bounded(value.levels.shoes, 4),
    };
    const capacity = BASKET_CAPACITIES[levels.basket] ?? 18;
    const grain = bounded(value.grain, capacity);
    const outputProgress = typeof value.outputProgress === "number" && Number.isFinite(value.outputProgress) ? Math.max(0, Math.min(.999, value.outputProgress)) : 0;
    return {
      version: 2,
      farmOwned: value.farmOwned === true,
      workers: { server: value.workers?.server === true, farmer: value.farmOwned === true && value.workers?.farmer === true },
      cargo: { server: value.workers?.server === true ? bounded(value.cargo?.server, 6) : 0, farmer: value.farmOwned === true && value.workers?.farmer === true ? bounded(value.cargo?.farmer, 18) : 0 },
      outputProgress,
      levels,
      coins: bounded(value.coins, 9999999),
      served: bounded(value.served, 999999),
      lost: bounded(value.lost, 999999),
      streak: bounded(value.streak, 999999),
      harvested: bounded(value.harvested, 9999999),
      grain,
      pizzas: bounded(value.pizzas, capacity - grain),
      ovenWheat: bounded(value.ovenWheat, 72),
      readyPizzas: bounded(value.readyPizzas, 24 - Number(outputProgress > 0)),
      bakeProgress:
        typeof value.bakeProgress === "number"
          ? Math.max(0, Math.min(1, value.bakeProgress)) || 0
          : 0,
      position: { x: -0.8, z: 3.5 },
    };
  } catch {
    return;
  }
}

export class Game {
  state: SaveData;
  crops: Crop[] = [];
  events: GameEvent[] = [];
  elapsed = 0;
  moving = false;
  pizzaWorker: Worker = this.makeWorker(STATIONS.pickup);
  farmWorker: Worker = this.makeWorker(PURCHASES.farmer);
  customers: Customer[] = [];
  lastStage = 1;
  private customerOrder = 6;
  private arrivalCooldown = 0;
  private harvestCooldown = 0;
  private stationCooldown = 0;

  constructor(saved?: SaveData) {
    this.state = saved ?? {
      version: 2,
      farmOwned: false,
      workers: { server: false, farmer: false },
      cargo: { server: 0, farmer: 0 },
      outputProgress: 0,
      coins: 0,
      served: 0,
      lost: 0,
      streak: 0,
      harvested: 0,
      grain: 0,
      pizzas: 0,
      ovenWheat: 0,
      readyPizzas: 0,
      bakeProgress: 0,
      levels: { basket: 0, oven: 0, shoes: 0 },
      position: { x: -0.8, z: 3.5 },
    };
    this.lastStage = this.rushStage.stage;
    for (let row = 0; row < 12; row++) {
      for (let col = 0; col < 11; col++) {
        this.crops.push({
          x: FIELD.left + 0.35 + col * 0.74,
          z: FIELD.back + 0.35 + row * 0.75,
          readyAt: 0,
          expansion: false,
        });
      }
    }
    for (let row = 0; row < 12; row++) {
      for (let col = 0; col < 13; col++) {
        this.crops.push({ x: EXTRA_FIELD.left + .25 + col * .74, z: EXTRA_FIELD.back + .35 + row * .75, readyAt: 0, expansion: true });
      }
    }
    const initialStage = this.rushStage;
    this.customers = Array.from({ length: 6 }, (_, id) => this.initCustomer(id, id < initialStage.maxQueue ? "arriving" : "away", id));
  }

  initCustomer(id: number, mode: Customer["mode"] = "away", queueOrder = 0): Customer {
    const stage = this.rushStage;
    let neededPizzas = 1;
    if (Math.random() < stage.multiPizzaProb) {
      neededPizzas = stage.stage >= 4 && Math.random() < 0.35 ? 3 : 2;
    }
    const maxPatience = stage.patience + (neededPizzas - 1) * 6;
    return {
      id,
      position: { x: 13.5 + id * 1.4, z: 7.65 },
      heading: -Math.PI / 2,
      moving: false,
      mode,
      order: queueOrder,
      wait: 0,
      compliment: "",
      patience: maxPatience,
      maxPatience,
      neededPizzas,
      servedPizzas: 0,
      mood: "neutral",
    };
  }

  spawnCustomer(customer: Customer) {
    const stage = this.rushStage;
    let neededPizzas = 1;
    if (Math.random() < stage.multiPizzaProb) {
      neededPizzas = stage.stage >= 4 && Math.random() < 0.35 ? 3 : 2;
    }
    const maxPatience = stage.patience + (neededPizzas - 1) * 6;
    customer.position = { x: 14, z: 7.65 };
    customer.mode = "arriving";
    customer.order = this.customerOrder++;
    customer.compliment = "";
    customer.neededPizzas = neededPizzas;
    customer.servedPizzas = 0;
    customer.maxPatience = maxPatience;
    customer.patience = maxPatience;
    customer.mood = "neutral";
    customer.wait = 0;
    customer.heading = -Math.PI / 2;
  }

  get rushStage(): RushStage {
    let current = RUSH_STAGES[0];
    for (const stage of RUSH_STAGES) {
      if (this.state.served >= stage.minServed) current = stage;
    }
    return current;
  }

  private makeWorker(position: Point): Worker {
    return { position: { x: position.x, z: position.z }, heading: 0, moving: false, cooldown: 0, delivering: false };
  }

  reset() {
    const fresh = new Game();
    this.state = fresh.state; this.elapsed = 0; this.events = []; this.moving = false;
    this.crops.forEach(crop => crop.readyAt = 0);
    this.pizzaWorker = fresh.pizzaWorker; this.farmWorker = fresh.farmWorker;
    this.customers = fresh.customers; this.customerOrder = 6; this.arrivalCooldown = 0;
    this.harvestCooldown = this.stationCooldown = 0;
    this.lastStage = 1;
  }

  owns(purchase: Purchase) {
    return purchase === "farm" ? this.state.farmOwned : this.state.workers[purchase];
  }

  purchaseReason(purchase: Purchase) {
    if (this.owns(purchase)) return "Already part of your farm";
    if (purchase === "farmer" && !this.state.farmOwned) return "Buy the wheat farm first";
    if (this.state.coins < PURCHASES[purchase].price) return `Save $${PURCHASES[purchase].price - this.state.coins} more`;
    return "";
  }

  get nearbyPurchase(): Purchase | undefined {
    return (["server", "farm", "farmer"] as Purchase[]).find(key =>
      !this.owns(key) && distance(this.state.position, PURCHASES[key]) < 1.65);
  }

  purchase(key: Purchase) {
    if (this.nearbyPurchase !== key || this.purchaseReason(key)) return false;
    this.state.coins -= PURCHASES[key].price;
    if (key === "farm") this.state.farmOwned = true;
    else this.state.workers[key] = true;
    this.events.push({ type: "upgrade", ...PURCHASES[key] });
    return true;
  }

  get capacity() {
    return BASKET_CAPACITIES[this.state.levels.basket] ?? 18;
  }
  get load() {
    return this.state.grain + this.state.pizzas;
  }
  get speed() {
    return SHOE_SPEEDS[this.state.levels.shoes] ?? 4.5;
  }
  get bakeTime() {
    return OVEN_TIMES[this.state.levels.oven] ?? 2.8;
  }
  get full() {
    return this.load >= this.capacity;
  }

  price(upgrade: Upgrade) {
    return UPGRADE_PRICES[upgrade][this.state.levels[upgrade]] ?? null;
  }

  buy(upgrade: Upgrade) {
    const price = this.price(upgrade);
    if (price === null || this.state.coins < price) return false;
    this.state.coins -= price;
    this.state.levels[upgrade]++;
    this.events.push({ type: "upgrade", ...this.state.position });
    return true;
  }

  step(dt: number, direction: Point = { x: 0, z: 0 }) {
    dt = Math.max(0, Math.min(dt, 0.1));
    this.elapsed += dt;
    this.harvestCooldown = Math.max(0, this.harvestCooldown - dt);
    this.stationCooldown = Math.max(0, this.stationCooldown - dt);
    this.move(direction, dt);
    this.updateCustomers(dt);
    const s = this.state;

    if (!this.full && this.harvestCooldown === 0) {
      const crop = this.crops.find(
        (crop) =>
          (!crop.expansion || s.farmOwned) && crop.readyAt <= this.elapsed && distance(crop, s.position) < 1.05,
      );
      if (crop) {
        crop.readyAt = this.elapsed + 14;
        s.grain++;
        s.harvested++;
        this.harvestCooldown = 0.075;
        this.events.push({ type: "harvest", x: crop.x, z: crop.z });
      }
    }

    if (this.stationCooldown === 0) {
      if (
        distance(s.position, STATIONS.delivery) < 1.35 &&
        s.grain > 0 &&
        s.ovenWheat < 72
      ) {
        s.grain--;
        s.ovenWheat++;
        this.stationCooldown = 0.09;
        this.events.push({ type: "deposit", ...STATIONS.delivery });
      } else if (
        distance(s.position, STATIONS.pickup) < 1.4 &&
        s.readyPizzas > 0 &&
        !this.full
      ) {
        s.readyPizzas--;
        s.pizzas++;
        this.stationCooldown = 0.2;
        this.events.push({ type: "pickup", ...STATIONS.pickup });
      } else if (distance(s.position, STATIONS.counter) < 1.6 && s.pizzas > 0 && this.serve("player")) {
        s.pizzas--;
        this.stationCooldown = 0.65;
      }
    }

    this.updateWorkers(dt);
    if (s.outputProgress > 0) {
      s.outputProgress += dt / .8;
      if (s.outputProgress >= 1) { s.outputProgress = 0; s.readyPizzas++; }
    }
    if (s.ovenWheat >= 3 && s.readyPizzas + Number(s.outputProgress > 0) < 24) {
      s.bakeProgress += dt / this.bakeTime;
      if (s.bakeProgress >= 1) {
        s.bakeProgress -= 1;
        s.ovenWheat -= 3;
        s.outputProgress = .001;
        this.events.push({ type: "baked", ...STATIONS.pickup });
      }
    }
  }

  private walk(actor: { position: Point; heading: number; moving: boolean }, target: Point, speed: number, dt: number) {
    const d = distance(actor.position, target);
    actor.moving = d > .04;
    if (!actor.moving) { actor.position.x = target.x; actor.position.z = target.z; return true; }
    const amount = Math.min(d, speed * dt);
    const dx = (target.x - actor.position.x) / d, dz = (target.z - actor.position.z) / d;
    actor.heading = Math.atan2(dx, dz);
    actor.position.x += dx * amount; actor.position.z += dz * amount;
    return amount === d;
  }

  private updateCustomers(dt: number) {
    const stage = this.rushStage;
    const queue = this.customers.filter(c => c.mode === "arriving" || c.mode === "waiting").sort((a, b) => a.order - b.order);
    queue.forEach((c, i) => {
      c.mode = this.walk(c, { x: QUEUE_FRONT.x + i * 1.25, z: QUEUE_FRONT.z }, 2.2, dt) ? "waiting" : "arriving";
      if (!c.moving) c.heading = Math.PI;
    });

    for (const c of queue) {
      if (c.mode === "waiting") {
        c.patience = Math.max(0, c.patience - dt);
        const ratio = c.patience / c.maxPatience;
        if (ratio > 0.5) c.mood = "neutral";
        else if (ratio > 0.2) c.mood = "impatient";
        else c.mood = "angry";

        if (c.patience === 0) {
          c.mode = "leaving";
          c.mood = "angry";
          c.wait = 1.0;
          c.compliment = angryQuotes[Math.floor(Math.random() * angryQuotes.length)];
          this.state.lost = (this.state.lost || 0) + 1;
          this.state.streak = 0;
          this.events.push({ type: "customer_lost", x: c.position.x, z: c.position.z, customer: c.id });
        }
      }
    }

    for (const c of this.customers) {
      if (c.mode === "leaving") {
        c.wait = Math.max(0, c.wait - dt);
        if (c.wait > 0) { c.moving = false; continue; }
        const target = c.position.z < 9.25 ? { x: c.position.x, z: 9.3 } : { x: 14, z: 9.3 };
        const exitSpeed = c.mood === "angry" ? 3.4 : 2.5;
        if (this.walk(c, target, exitSpeed, dt) && c.position.x >= 14) {
          c.mode = "away";
          c.moving = false;
        }
      }
    }

    this.arrivalCooldown = Math.max(0, this.arrivalCooldown - dt);
    const activeCount = this.customers.filter(c => c.mode === "arriving" || c.mode === "waiting").length;
    if (activeCount < stage.maxQueue && this.arrivalCooldown === 0) {
      const candidate = this.customers.find(c => c.mode === "away");
      if (candidate) {
        this.spawnCustomer(candidate);
        this.arrivalCooldown = stage.arrivalCooldown;
      }
    }
  }

  get waitingCustomers() {
    return this.customers.filter(c => c.mode === "waiting" || c.mode === "arriving").length;
  }

  private serve(actor: "player" | "server") {
    const customer = this.customers.filter(c => c.mode === "waiting" || c.mode === "arriving").sort((a, b) => a.order - b.order)[0];
    if (!customer || customer.mode !== "waiting" || distance(customer.position, QUEUE_FRONT) > .1) return false;

    customer.servedPizzas++;
    const isOrderComplete = customer.servedPizzas >= customer.neededPizzas;

    if (!isOrderComplete) {
      customer.patience = Math.min(customer.maxPatience, customer.patience + 6);
      customer.compliment = `${customer.servedPizzas}/${customer.neededPizzas} pizzas! 🍕`;
      this.state.coins += 12;
      this.events.push({ type: "sale", ...STATIONS.counter, amount: 12, actor, customer: customer.id });
      return true;
    }

    customer.mode = "leaving";
    customer.mood = "happy";
    customer.wait = 1.2;
    customer.compliment = compliments[this.state.served % compliments.length];
    this.state.served++;
    this.state.streak = (this.state.streak || 0) + 1;

    const isSpeedy = (customer.patience / customer.maxPatience) >= 0.5;
    const tip = isSpeedy ? 4 : 0;
    const saleAmount = 12 + tip;
    this.state.coins += saleAmount;

    if (tip > 0) {
      this.events.push({ type: "tip", ...STATIONS.counter, amount: tip, customer: customer.id });
    }
    this.events.push({ type: "sale", ...STATIONS.counter, amount: saleAmount, actor, customer: customer.id });

    if (this.state.served === 10) this.events.push({ type: "milestone", ...this.state.position });

    const newStage = this.rushStage.stage;
    if (newStage > this.lastStage) {
      this.lastStage = newStage;
      this.events.push({ type: "rush_up", ...STATIONS.counter, amount: newStage });
    }

    return true;
  }

  private updateWorkers(dt: number) {
    const s = this.state, server = this.pizzaWorker, farmer = this.farmWorker;
    server.moving = farmer.moving = false;
    server.cooldown = Math.max(0, server.cooldown - dt);
    farmer.cooldown = Math.max(0, farmer.cooldown - dt);
    if (s.workers.server) {
      if (s.cargo.server > 0 && (server.delivering || s.cargo.server >= 6 || s.readyPizzas === 0)) server.delivering = true;
      const target = server.delivering ? STATIONS.counter : STATIONS.pickup;
      if (this.walk(server, target, 3.3, dt) && server.cooldown === 0) {
        if (server.delivering) {
          if (this.serve("server")) { s.cargo.server--; server.cooldown = .65; }
          if (s.cargo.server === 0) server.delivering = false;
        } else if (s.readyPizzas > 0 && s.cargo.server < 6) {
          s.readyPizzas--; s.cargo.server++; server.cooldown = .18;
          this.events.push({ type: "pickup", ...server.position, actor: "server" });
        }
      }
    }
    if (s.workers.farmer && s.farmOwned) {
      let crop: Crop | undefined;
      let nearest = Infinity;
      for (const candidate of this.crops) {
        if (!candidate.expansion || candidate.readyAt > this.elapsed) continue;
        const d = distance(candidate, farmer.position);
        if (d < nearest) { crop = candidate; nearest = d; }
      }
      if (s.cargo.farmer >= 18 || (s.cargo.farmer > 0 && !crop)) farmer.delivering = true;
      if (farmer.delivering || s.cargo.farmer > 0 && farmer.position.x > -12) {
        farmer.delivering = true;
        // Leave the field through the open front path before approaching the oven.
        const target = farmer.position.x < -1.5 && farmer.position.z < 2.6 ? { x: farmer.position.x, z: 2.8 }
          : farmer.position.x < -1.5 ? { x: -1.4, z: 2.8 } : STATIONS.delivery;
        if (this.walk(farmer, target, 3.6, dt) && distance(farmer.position, STATIONS.delivery) < .1 && farmer.cooldown === 0 && s.ovenWheat < 72) {
          s.cargo.farmer--; s.ovenWheat++; farmer.cooldown = .1;
          this.events.push({ type: "deposit", ...farmer.position, actor: "farmer" });
          if (s.cargo.farmer === 0) farmer.delivering = false;
        }
      } else if (crop) {
        const target = farmer.position.x > -12 && farmer.position.z < 2.6 ? { x: -1.4, z: 2.8 }
          : farmer.position.x > -12 ? { x: -14, z: 2.8 } : crop;
        if (this.walk(farmer, target, 3.6, dt) && distance(farmer.position, crop) < .15 && farmer.cooldown === 0) {
          crop.readyAt = this.elapsed + 14; s.cargo.farmer++; s.harvested++; farmer.cooldown = .2;
          this.events.push({ type: "harvest", x: crop.x, z: crop.z, actor: "farmer" });
        }
      }
    }
  }

  private move(input: Point, dt: number) {
    const length = Math.hypot(input.x, input.z);
    this.moving = length > 0.01;
    if (!this.moving) return;
    const amount = (this.speed * dt) / Math.max(1, length);
    const position = this.state.position;
    const allowed = (x: number, z: number) =>
      !OBSTACLES.some(
        (b) =>
          x > b.left - 0.32 &&
          x < b.right + 0.32 &&
          z > b.back - 0.32 &&
          z < b.front + 0.32,
      );
    const x = Math.max(-24.1, Math.min(12.1, position.x + input.x * amount));
    if (allowed(x, position.z)) position.x = x;
    const z = Math.max(-8.1, Math.min(9.2, position.z + input.z * amount));
    if (allowed(position.x, z)) position.z = z;
  }

  get objective(): {
    title: string;
    detail: string;
    target: Point;
    step: number;
  } {
    const s = this.state;
    if (s.pizzas > 0)
      return {
        title: "Fresh pizza, coming through!",
        detail: "Take your pizzas to the striped counter.",
        target: STATIONS.counter,
        step: 3,
      };
    if (
      s.grain > 0 &&
      (this.full || distance(s.position, STATIONS.delivery) < 2.5)
    )
      return {
        title: "Time to make some dough",
        detail: "Stand on the wheat pad to fill the oven.",
        target: STATIONS.delivery,
        step: 1,
      };
    const next = (["server", "farm", "farmer"] as Purchase[]).find(key => !this.owns(key) && !this.purchaseReason(key));
    if (next && s.grain === 0) return {
      title: PURCHASES[next].title,
      detail: "Walk to its sign, then buy with your coins.",
      target: PURCHASES[next], step: 4,
    };
    if (s.workers.server && s.workers.farmer && s.grain === 0) return {
      title: "Your little team has it covered",
      detail: "Help in the fields or save up for oven upgrades.",
      target: STATIONS.delivery, step: 4,
    };
    if (s.readyPizzas > 0 && !this.full && !s.workers.server)
      return {
        title: "Hot out of the oven",
        detail: "Collect your pizzas at the green pad.",
        target: STATIONS.pickup,
        step: 2,
      };
    if ((s.ovenWheat >= 3 || s.outputProgress > 0) && s.grain === 0)
      return {
        title: "Good things take a little time",
        detail: s.workers.server ? "Your pizza worker will serve it. Keep the oven supplied." : "Your pizza is baking. Harvest more or wait by the oven.",
        target: STATIONS.pickup,
        step: 2,
      };
    if (s.grain > 0)
      return {
        title: "A little more wheat",
        detail: "Fill your basket, then head to the kitchen.",
        target: { x: -6.4, z: -0.5 },
        step: 0,
      };
    return {
      title: s.served
        ? "Let’s make another batch"
        : "Every pizza starts in the field",
      detail: "Walk into the wheat. We’ll take care of the harvesting.",
      target: { x: -6.4, z: -0.5 },
      step: 0,
    };
  }
}
