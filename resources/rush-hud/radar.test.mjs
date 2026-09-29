import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRushRadar, detectRushRoom, facingAngle, parseVector, worldToRadar, RUSH_RADAR_CONFIG } from './radar.mjs';

const player = (id, x, y, side = 'CT') => ({
  id, side, slot: Number(id.slice(-1)), health: 100, observed: id === 'p1',
  position: [x, y, 0], forward: [0, 1, 0]
});

test('GSI vectors parse without inventing missing coordinates', () => {
  assert.deepEqual(parseVector('2738, 6594, 128'), [2738, 6594, 128]);
  assert.deepEqual(parseVector([1, 0, 0]), [1, 0, 0]);
  assert.equal(parseVector('bad, 0, 0'), null);
  assert.equal(parseVector(undefined), null);
});

test('Valve overview calibration projects world coordinates onto the room texture', () => {
  const config = RUSH_RADAR_CONFIG.room104;
  assert.deepEqual(worldToRadar([config.posX, config.posY, 0], config), [0, 0]);
  assert.deepEqual(worldToRadar([config.posX + config.scale * 512, config.posY - config.scale * 512, 0], config), [512, 512]);
});

test('active randomized room is detected from the live roster positions', () => {
  const c = RUSH_RADAR_CONFIG.room209;
  const players = [
    player('p1', c.posX + c.scale * 300, c.posY - c.scale * 400),
    player('p2', c.posX + c.scale * 500, c.posY - c.scale * 500),
    player('p3', c.posX + c.scale * 700, c.posY - c.scale * 600, 'T')
  ];
  assert.equal(detectRushRoom(players), 'room209');
  const radar = buildRushRadar('maps/rush_001', players);
  assert.equal(radar.label, 'Room 209');
  assert.equal(radar.markers.length, 3);
  assert.deepEqual([radar.markers[0].x, radar.markers[0].y], [300, 400]);
});

test('facing uses the same top-down orientation as the radar', () => {
  assert.equal(facingAngle([0, 1, 0]), 0);
  assert.equal(facingAngle([1, 0, 0]), 90);
  assert.equal(facingAngle([-1, 0, 0]), -90);
});

test('unsupported maps and snapshots without positions do not fabricate a radar', () => {
  assert.equal(buildRushRadar('de_dust2', []), null);
  assert.equal(buildRushRadar('rush_001', [{ id: 'p1', position: null }]), null);
});
