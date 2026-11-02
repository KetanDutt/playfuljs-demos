// Dependency-free regression checks for gameplay logic. Run with node tests/game.test.js.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const listeners = {};
function element() {
  return { dataset: {}, classList: { toggle() {}, add() {}, remove() {} },
    addEventListener() {}, setAttribute() {}, getContext() { return { setTransform() {} }; } };
}
const elements = Object.fromEntries(['display', 'instructions', 'play', 'help', 'mute', 'toast'].map(id => [id, element()]));
const document = { hidden: false, getElementById: id => elements[id],
  addEventListener: (name, fn) => { (listeners[name] ||= []).push(fn); },
  querySelectorAll: () => [], querySelector: () => element() };
const context = { document, window: { devicePixelRatio: 1, addEventListener() {} },
  matchMedia: () => ({ matches: false }), Image: function () {},
  requestAnimationFrame() {}, performance: { now: () => 0 },
  setTimeout() {}, clearTimeout() {}, innerWidth: 800, innerHeight: 600,
  pointerRelease() {}, lockPointer() {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('raycaster/js/game.js', 'utf8'), context);
const map = new context.Map(5);
assert.equal(map.get(-1, 0), 1, 'outside the map is solid');
map.wallGrid[2 * 5 + 2] = 1;
assert.equal(context.hasLineOfSight(1.5, 2.5, 3.5, 2.5, map), false, 'walls block sight');
assert.equal(context.hasLineOfSight(1.5, 1.5, 3.5, 1.5, map), true, 'open corridors have sight');
const ray = map.cast({x: 1.5, y: 2.5}, 0, 10);
assert.equal(ray[ray.length - 1].height, 1, 'rays stop at the first wall');
assert.equal(ray.length, 2, 'rays do not traverse behind a wall');
context.player.x = 1.5; context.player.y = 2.5; context.player.direction = 0;
context.map = map;
map.objects = [{ x: 3.5, y: 2.5, isEnemy: true, dead: false }];
context.player.attack();
assert.equal(map.objects[0].dead, false, 'attacks cannot pass through walls');
context.player.attackTime = 0; map.wallGrid[12] = 0;
context.player.attack();
assert.equal(map.objects[0].dead, true, 'attacks hit visible enemies');
context.controls.states.forward = true;
context.setPaused(true);
assert.equal(context.controls.states.forward, false, 'pausing clears held input');
console.log('Game regression checks passed.');
