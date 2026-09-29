import test from 'node:test';
import assert from 'node:assert/strict';
import { changes, presentationChanges } from './motion.mjs';
import { normalize } from './model.mjs';
import { fixture } from './preview.mjs';

test('damage and death effects only follow observed health loss', () => {
  const before = normalize(fixture);
  const raw = structuredClone(fixture);
  raw.allplayers.ct2.state.health = 43;
  raw.allplayers.t3.state.health = 0;
  assert.deepEqual(changes(before, normalize(raw)), [
    { id: 'ct2', damage: 21, died: false }, { id: 't3', damage: 26, died: true }
  ]);
  assert.deepEqual(changes(before, before), []);
  assert.deepEqual(changes(normalize(raw), before), []);
});

test('joining, reconnecting, missing health and round resets do not produce damage', () => {
  const before = normalize(fixture);
  const raw = structuredClone(fixture);
  raw.allplayers.ct2.state.health = 0;
  const after = normalize(raw);
  assert.deepEqual(changes(null, after), []);
  assert.deepEqual(changes(normalize({}), after), []);
  assert.deepEqual(changes(before, { ...after, round: 2 }), []);
  assert.deepEqual(changes(before, { ...after, map: 'another_map' }), []);
  assert.deepEqual(changes(before, { ...after, ct: { ...after.ct, score: 3 } }), []);
  delete raw.allplayers.ct2.state.health;
  assert.deepEqual(changes(before, normalize(raw)), []);
});

test('presentation changes identify UI events without treating countdown ticks as events', () => {
  const before = normalize(fixture);
  assert.equal(presentationChanges(null, before).initial, true);
  const tick = structuredClone(fixture);
  tick.phase_countdowns.phase_ends_in = '42';
  const quiet = presentationChanges(before, normalize(tick));
  assert.equal(quiet.phase, false);
  assert.equal(quiet.round, false);
  assert.equal(quiet.players.some(player => player.stats || player.equipment || player.died), false);
  const raw = structuredClone(fixture);
  raw.phase_countdowns.phase = 'over';
  raw.map.team_ct.score = 3;
  raw.allplayers.ct2.state.health = 0;
  raw.allplayers.ct2.state.money = 2000;
  raw.allplayers.ct1.weapons.weapon_0.state = 'holstered';
  raw.allplayers.ct1.weapons.weapon_1 = { name: 'weapon_usp_silencer', state: 'active', type: 'Pistol', ammo_clip: 12, ammo_reserve: 24 };
  const events = presentationChanges(before, normalize(raw));
  assert.equal(events.phase, true);
  assert.deepEqual(events.scores, ['ct']);
  assert.equal(events.players.find(player => player.id === 'ct2').died, true);
  assert.equal(events.players.find(player => player.id === 'ct2').dead, true);
  assert.equal(events.players.find(player => player.id === 'ct2').stats, true);
  assert.equal(events.players.find(player => player.id === 'ct1').equipment, true);
});

test('player actions request a card glow without moving inventory or health elements', () => {
  const before = normalize(fixture);
  const shot = structuredClone(fixture);
  shot.allplayers.ct2.weapons.weapon_0.ammo_clip -= 1;
  const event = presentationChanges(before, normalize(shot)).players.find(player => player.id === 'ct2');
  assert.equal(event.equipment, true);
  assert.equal(event.activity, true);
  const dead = structuredClone(shot);
  dead.allplayers.ct2.state.health = 0;
  const deadEvent = presentationChanges(normalize(shot), normalize(dead)).players.find(player => player.id === 'ct2');
  assert.equal(deadEvent.activity, false);
});
