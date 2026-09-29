import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, clock, rushRoundLabel, rushWinner } from './model.mjs';
import { fixture } from './preview.mjs';

test('six-player spectator feed and RUSH spectarget resolve correctly', () => {
  const game = normalize(fixture);
  assert.equal(game.count, 6);
  assert.equal(game.ct.alive, 2);
  assert.equal(game.t.alive, 3);
  assert.equal(game.observed.name, 'Player Two');
  assert.equal(game.observed.weapon, 'AWP');
  assert.equal(game.ct.score, 2);
  assert.equal(game.radar.room, 'room104');
  assert.equal(game.radar.markers.length, 6);
});
test('partial warmup spectator roster works without an observed player', () => {
  const raw = structuredClone(fixture);
  raw.map.phase = 'warmup';
  raw.phase_countdowns = { phase: 'warmup', phase_ends_in: '124.0' };
  raw.player = { spectarget: 'free-camera' };
  delete raw.allplayers.ct3;
  const game = normalize(raw);
  assert.equal(game.isRush, true);
  assert.equal(game.count, 5);
  assert.equal(game.observed, null);
  assert.equal(game.time, '2:04');
});
test('partial warmup, disconnects, and missing health do not fabricate data', () => {
  assert.equal(normalize({ map: { mode: 'rush' } }).count, 0);
  assert.equal(normalize({}).ct.score, null);
  assert.equal(normalize({ allplayers: { x: { team: 'CT' } } }).ct.alive, null);
  assert.equal(normalize({ player: { name: 'Observer', team: 'T' } }).count, 0);
  assert.equal(normalize({ previously: fixture, added: fixture }).count, 0);
});
test('missing roster replaces old roster; spectator and coach slots are not invented', () => {
  normalize(fixture);
  assert.equal(normalize({ map: fixture.map, allplayers: {} }).count, 0);
  assert.equal(normalize({ allplayers: { a: { team: 'SPECTATOR' } } }).count, 0);
});
test('confirmed deaths stay latched through stale same-round GSI updates', () => {
  const deadRaw = structuredClone(fixture);
  deadRaw.allplayers.ct2.state.health = 0;
  const dead = normalize(deadRaw);
  const missingHealth = structuredClone(deadRaw);
  delete missingHealth.allplayers.ct2.state.health;
  const retainedMissing = normalize(missingHealth, dead);
  assert.equal(retainedMissing.ct.players.find(player => player.id === 'ct2').health, 0);
  assert.equal(retainedMissing.ct.alive, 1);
  assert.equal(retainedMissing.radar.markers.find(player => player.id === 'ct2').dead, true);
  const staleHealth = structuredClone(deadRaw);
  staleHealth.allplayers.ct2.state.health = 64;
  assert.equal(normalize(staleHealth, dead).ct.players.find(player => player.id === 'ct2').health, 0);
  const omitted = structuredClone(deadRaw);
  delete omitted.allplayers.ct2;
  const retainedOmitted = normalize(omitted, dead);
  assert.equal(retainedOmitted.count, 6);
  assert.equal(retainedOmitted.ct.players.find(player => player.id === 'ct2').health, 0);
  assert.equal(retainedOmitted.radar.markers.find(player => player.id === 'ct2').dead, true);
  staleHealth.phase_countdowns.phase = 'freezetime';
  assert.equal(normalize(staleHealth, dead).ct.players.find(player => player.id === 'ct2').health, 64);
  staleHealth.phase_countdowns.phase = 'live';
  staleHealth.map.round += 1;
  assert.equal(normalize(staleHealth, dead).ct.players.find(player => player.id === 'ct2').health, 64);
});
test('rekeyed and overlapping GSI entries cannot duplicate a dead roster slot', () => {
  const deadRaw = structuredClone(fixture);
  deadRaw.allplayers.ct2.state.health = 0;
  const dead = normalize(deadRaw);

  const rekeyed = structuredClone(deadRaw);
  rekeyed.allplayers['ct2-rekeyed'] = structuredClone(rekeyed.allplayers.ct2);
  rekeyed.allplayers['ct2-rekeyed'].state.health = 100;
  delete rekeyed.allplayers.ct2;
  rekeyed.player.spectarget = 'ct2-rekeyed';
  const retained = normalize(rekeyed, dead);
  const slotTwo = retained.ct.players.filter(player => player.slot === 2);
  assert.equal(retained.count, 6);
  assert.equal(slotTwo.length, 1);
  assert.equal(slotTwo[0].id, 'ct2');
  assert.equal(slotTwo[0].health, 0);
  assert.equal(slotTwo[0].observed, true);

  const overlapping = structuredClone(deadRaw);
  overlapping.allplayers['ct2-rekeyed'] = structuredClone(overlapping.allplayers.ct2);
  overlapping.allplayers['ct2-rekeyed'].state.health = 100;
  const deduped = normalize(overlapping, dead);
  assert.equal(deduped.count, 6);
  assert.equal(deduped.ct.players.filter(player => player.slot === 2).length, 1);
  assert.equal(deduped.ct.players.find(player => player.slot === 2).health, 0);
});
test('different players sharing remapped observer slots remain in the roster', () => {
  const collided = structuredClone(fixture);
  collided.allplayers.ct3.observer_slot = collided.allplayers.ct2.observer_slot;
  collided.allplayers.t3.observer_slot = collided.allplayers.t1.observer_slot;
  const game = normalize(collided);
  assert.equal(game.count, 6);
  assert.equal(game.ct.players.length, 3);
  assert.equal(game.t.players.length, 3);
  assert.deepEqual(game.ct.players.map(player => player.name).sort(), ['Player One', 'Player Three', 'Player Two']);
  assert.deepEqual(game.t.players.map(player => player.name).sort(), ['Player Five', 'Player Four', 'Player Six']);
});
test('mode detection does not mistake another 3v3 match for RUSH', () => {
  assert.equal(normalize({ ...fixture, map: { mode: 'competitive', name: 'rush_001' } }).isRush, false);
});
test('match end takes priority over the last round countdown', () => {
  assert.equal(normalize({ ...fixture, map: { ...fixture.map, phase: 'gameover' } }).phase, 'gameover');
});
test('timer uses only valid reported countdowns', () => {
  assert.equal(clock('60.1'), '1:01');
  assert.equal(clock('0'), '0:00');
  for (const value of [undefined, null, '', 'bad', -1]) assert.equal(clock(value), '—:—');
});

test('RUSH has fourteen regulation rounds and a 7-7 tiebreak, never competitive overtime', () => {
  const map = { mode: 'rush', phase: 'live', round: 0, team_ct: { score: 0 }, team_t: { score: 0 } };
  assert.equal(rushRoundLabel(map, 'live'), 'Round 1/14');
  assert.equal(rushRoundLabel({ ...map, round: 13, team_ct: { score: 7 }, team_t: { score: 6 } }, 'live'), 'Round 14/14');
  const tied = { ...map, round: 13, team_ct: { score: 7 }, team_t: { score: 7 } };
  assert.equal(rushRoundLabel(tied, 'over'), 'Round 14/14');
  assert.equal(rushRoundLabel({ ...tied, round: 14 }, 'freezetime'), 'Tiebreak');
  assert.equal(rushRoundLabel({ ...tied, round: undefined }, 'live'), 'Tiebreak');
  assert.equal(rushRoundLabel({ ...tied, round: 14 }, 'over'), 'Tiebreak');
  assert.equal(rushRoundLabel({ ...tied, phase: 'gameover' }, 'over'), 'Match ended');
  assert.equal(rushRoundLabel({ ...map, phase: 'warmup' }, 'warmup'), 'Warmup');
  assert.equal(rushRoundLabel({ mode: 'rush' }), 'RUSH');
  assert.equal(rushRoundLabel({ ...map, round: 24 }), 'RUSH');
  assert.equal(rushRoundLabel({ ...map, mode: 'competitive' }, 'live'), '');
});

test('round kill cards use reported round kills, not cumulative match kills', () => {
  const raw = structuredClone(fixture);
  raw.allplayers.ct2.state.round_kills = 2;
  delete raw.allplayers.ct1.state.round_kills;
  const game = normalize(raw);
  assert.equal(game.observed.roundKills, 2);
  assert.equal(game.observed.kills, 7);
  assert.equal(game.ct.players[0].roundKills, null);
  assert.equal(game.observed.weaponId, 'awp');
});

test('round winner, timeouts, equipment and utility use only reported fields', () => {
  const raw = structuredClone(fixture);
  raw.phase_countdowns.phase = 'over';
  raw.round = { phase: 'over', win_team: 'T' };
  raw.map.team_ct.timeouts_remaining = 1;
  raw.allplayers.ct1.weapons.weapon_1 = { name: 'weapon_flashbang', type: 'Grenade', state: 'holstered', ammo_reserve: 2 };
  raw.allplayers.ct1.weapons.weapon_2 = { name: 'weapon_usp_silencer', type: 'Pistol', state: 'holstered', ammo_clip: 12, ammo_reserve: 24 };
  const game = normalize(raw);
  assert.equal(game.roundWinner, 'T');
  assert.equal(game.ct.timeoutsRemaining, 1);
  assert.equal(game.ct.utility.flashbang, 2);
  assert.deepEqual(game.ct.players[0].grenades.map(item => item.name), ['Flash']);
  assert.deepEqual(game.ct.players[0].equipment.map(item => item.name), ['M4A1-S', 'USP-S']);
  delete raw.round.win_team;
  delete raw.map.team_ct.timeouts_remaining;
  delete raw.allplayers.ct1.weapons.weapon_1.ammo_reserve;
  const missing = normalize(raw);
  assert.equal(missing.roundWinner, null);
  assert.equal(missing.ct.timeoutsRemaining, null);
  assert.equal(missing.ct.utility, null);
});

test('inventory is ordered primary, secondary, then equipment and knife suppresses ammo', () => {
  const raw = structuredClone(fixture);
  raw.allplayers.ct2.weapons = {
    knife: { name: 'weapon_knife', type: 'Knife', state: 'active' },
    grenade: { name: 'weapon_flashbang', type: 'Grenade', state: 'holstered', ammo_reserve: 2 },
    pistol: { name: 'weapon_usp_silencer', type: 'Pistol', state: 'holstered', ammo_clip: 12, ammo_reserve: 24 },
    primary: { name: 'weapon_awp', type: 'SniperRifle', state: 'holstered', ammo_clip: 5, ammo_reserve: 20 }
  };
  let game = normalize(raw);
  assert.deepEqual(game.observed.inventoryItems.map(item => item.category), ['primary', 'secondary', 'equipment', 'equipment']);
  assert.deepEqual(game.observed.inventoryItems.map(item => item.id), ['awp', 'usp_silencer', 'knife', 'flashbang']);
  assert.equal(game.observed.showsAmmo, false);
  raw.allplayers.ct2.weapons.knife.state = 'holstered';
  raw.allplayers.ct2.weapons.primary.state = 'active';
  game = normalize(raw);
  assert.equal(game.observed.showsAmmo, true);
  assert.equal(game.observed.ammo, 5);
  assert.equal(game.observed.reserve, 20);
});

test('winner requires gameover and a conclusive result, including the RUSH tiebreak', () => {
  const map = { mode: 'rush', phase: 'gameover', round: 14, team_ct: { score: 8 }, team_t: { score: 7 } };
  assert.equal(rushWinner({ map }), 'CT');
  assert.equal(rushWinner({ map: { ...map, team_ct: { score: 7 }, team_t: { score: 8 } } }), 'T');
  assert.equal(rushWinner({ map: { ...map, phase: 'live' } }), null);
  assert.equal(rushWinner({ map: { ...map, mode: 'competitive' } }), null);
  assert.equal(rushWinner({ map: { ...map, team_ct: {} } }), null);
  const tied = { ...map, team_ct: { score: 7 } };
  assert.equal(rushWinner({ map: tied }), null);
  assert.equal(rushWinner({ map: tied, round: { phase: 'over', win_team: 'T' } }), 'T');
  assert.equal(rushWinner({ map: { ...tied, round: 13 }, round: { phase: 'over', win_team: 'CT' } }), null);
  assert.equal(rushWinner({ map: tied, round: { phase: 'live', win_team: 'CT' } }), null);
});
