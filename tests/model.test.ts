import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, readSave, STATIONS } from '../src/model.ts';

function advance(game: Game, seconds: number) {
  for (let i = 0; i < Math.ceil(seconds / .05); i++) game.step(.05);
}

test('a harvest, bake, pickup, and sale cycle conserves ingredients and pays coins', () => {
  const game = new Game();
  for (let i = 0; i < 18; i++) { game.state.position = { ...game.crops[i * 2] }; advance(game, .1); }
  assert.equal(game.state.grain, 18);
  assert.equal(game.full, true);
  game.state.position = { ...STATIONS.delivery };
  advance(game, 2);
  assert.equal(game.state.grain, 0);
  assert.equal(game.state.ovenWheat, 18);
  game.state.position = { x: 0, z: 3 };
  advance(game, 17);
  assert.equal(game.state.ovenWheat, 0);
  assert.equal(game.state.readyPizzas, 6);
  game.state.position = { ...STATIONS.pickup };
  advance(game, 2);
  assert.equal(game.state.pizzas, 6);
  assert.equal(game.state.readyPizzas, 0);
  game.state.position = { ...STATIONS.counter };
  advance(game, 3);
  assert.equal(game.state.served, 6);
  assert.equal(game.state.pizzas, 0);
  assert.equal(game.state.coins, 72);
  assert.equal(game.buy('basket'), true);
  assert.equal(game.capacity, 27);
  assert.equal(game.state.coins, 36);
});

test('wheat regrows and capacity never overflows', () => {
  const game = new Game();
  game.state.position = { ...game.crops[0] };
  advance(game, 1);
  assert.ok(game.crops[0].readyAt > game.elapsed);
  game.state.position = { x: 0, z: 4 };
  advance(game, 15);
  assert.ok(game.crops[0].readyAt <= game.elapsed);
  game.state.grain = game.capacity;
  game.state.position = { ...game.crops[0] };
  advance(game, 2);
  assert.equal(game.load, game.capacity);
  game.state.readyPizzas = 3;
  game.state.position = { ...STATIONS.pickup };
  advance(game, 1);
  assert.equal(game.state.pizzas, 0);
});

test('the oven waits for three wheat and pauses when its output is full', () => {
  const game = new Game();
  game.state.ovenWheat = 2;
  advance(game, 6);
  assert.equal(game.state.readyPizzas, 0);
  assert.equal(game.state.ovenWheat, 2);
  game.state.ovenWheat = 3;
  game.state.readyPizzas = 24;
  advance(game, 6);
  assert.equal(game.state.ovenWheat, 3);
  assert.equal(game.state.readyPizzas, 24);
  game.state.position = { ...STATIONS.pickup };
  advance(game, 4);
  assert.equal(game.state.ovenWheat, 0);
  assert.equal(game.state.readyPizzas + game.state.pizzas, 25);
});

test('unaffordable and maxed upgrades cannot spend coins', () => {
  const game = new Game();
  assert.equal(game.buy('oven'), false);
  assert.equal(game.state.levels.oven, 0);
  game.state.coins = 1000;
  assert.equal(game.buy('oven'), true);
  assert.equal(game.buy('oven'), true);
  assert.equal(game.buy('oven'), true);
  const before = game.state.coins;
  assert.equal(game.buy('oven'), false);
  assert.equal(game.state.coins, before);
  assert.equal(game.bakeTime, 1);
});

test('ten pizzas emit the milestone once and play can continue', () => {
  const game = new Game();
  game.state.position = { ...STATIONS.counter };
  game.state.pizzas = 12;
  advance(game, 6);
  assert.equal(game.state.served, 12);
  assert.equal(game.state.coins, 144);
  assert.equal(game.events.filter(event => event.type === 'milestone').length, 1);
});

test('save loading preserves progress and handles malformed data', () => {
  const game = new Game();
  game.state.coins = 77; game.state.pizzas = 2; game.state.levels.basket = 1;
  const loaded = readSave(JSON.stringify(game.state))!;
  assert.equal(loaded.coins, 77); assert.equal(loaded.pizzas, 2); assert.equal(loaded.levels.basket, 1);
  assert.equal(readSave('broken'), undefined); assert.equal(readSave('null'), undefined);
  assert.equal(readSave('{"version":7}'), undefined);
  const sanitized = readSave(JSON.stringify({ ...game.state, grain: 1000, coins: -5, levels: { basket: 900, oven: -3, shoes: 'bad' } }))!;
  assert.equal(sanitized.grain, 45); assert.equal(sanitized.coins, 0); assert.equal(sanitized.pizzas, 0);
  assert.deepEqual(sanitized.levels, { basket: 3, oven: 0, shoes: 0 });
});

test('keyboard movement cannot pass through kitchen equipment or leave the island', () => {
  const game = new Game();
  game.state.position = { x: 3.4, z: -2 };
  for (let i = 0; i < 120; i++) game.step(.05, { x: 0, z: -1 });
  assert.ok(game.state.position.z > -2.7);
  game.state.position = { x: 0, z: 0 };
  for (let i = 0; i < 1000; i++) game.step(.05, { x: 1, z: 1 });
  assert.ok(game.state.position.x <= 12.1 && game.state.position.z <= 8.1);
});
