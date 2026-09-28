import { OBSTACLES, type Point } from './model.ts';

const SIZE = .5;
const columns = 49, rows = 33;
const point = (index: number): Point => ({ x: index % columns * SIZE - 12, z: Math.floor(index / columns) * SIZE - 8 });
const indexOf = (p: Point) => Math.round((Math.max(-8, Math.min(8, p.z)) + 8) / SIZE) * columns + Math.round((Math.max(-12, Math.min(12, p.x)) + 12) / SIZE);
const walkable = (index: number) => {
  const p = point(index);
  return !OBSTACLES.some(b => p.x > b.left - .4 && p.x < b.right + .4 && p.z > b.back - .4 && p.z < b.front + .4);
};
function nearest(p: Point) {
  const start = indexOf(p);
  if (walkable(start)) return start;
  let best = start, distance = Infinity;
  for (let i = 0; i < columns * rows; i++) {
    if (!walkable(i)) continue;
    const test = point(i), d = (p.x - test.x) ** 2 + (p.z - test.z) ** 2;
    if (d < distance) { distance = d; best = i; }
  }
  return best;
}

/** A small A* grid keeps tap-to-walk routes clear of kitchen equipment. */
export function findPath(from: Point, to: Point): Point[] {
  const start = nearest(from), end = nearest(to);
  const open = new Set([start]), closed = new Set<number>();
  const cost = new Map([[start, 0]]), previous = new Map<number, number>();
  const estimate = (i: number) => { const p = point(i), e = point(end); return Math.hypot(p.x - e.x, p.z - e.z); };
  while (open.size) {
    let current = -1, score = Infinity;
    for (const i of open) { const s = cost.get(i)! + estimate(i); if (s < score) { score = s; current = i; } }
    if (current === end) {
      const route: Point[] = [];
      while (current !== start) { route.unshift(point(current)); current = previous.get(current)!; }
      return route.length ? route : [point(end)];
    }
    open.delete(current); closed.add(current);
    const col = current % columns, row = Math.floor(current / columns);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const x = col + dx, z = row + dz, next = z * columns + x;
      if (x < 0 || x >= columns || z < 0 || z >= rows || closed.has(next) || !walkable(next)) continue;
      if (dx && dz && (!walkable(row * columns + x) || !walkable(z * columns + col))) continue;
      const nextCost = cost.get(current)! + Math.hypot(dx, dz) * SIZE;
      if (nextCost >= (cost.get(next) ?? Infinity)) continue;
      previous.set(next, current); cost.set(next, nextCost); open.add(next);
    }
  }
  return [];
}
