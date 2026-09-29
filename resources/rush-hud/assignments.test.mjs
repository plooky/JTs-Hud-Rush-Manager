import test from 'node:test';
import assert from 'node:assert/strict';
import { applyManagerAssignments, buildManagerAssignments, loadManagerAssignments } from './assignments.mjs';
import { normalize } from './model.mjs';
import { fixture } from './preview.mjs';
import { view } from './view.mjs';

const teams = [
  { _id: 'blue', name: 'Blue Team', logo: '/api/uploads/blue.png' },
  { _id: 'gold', name: 'Gold Team', logo: '/api/uploads/gold.jpg' }
];
const players = [
  { _id: 'b1', username: 'Blue One', steamid: 'ct1', team: 'blue', avatar: '/api/uploads/b1.png', extra: {} },
  { _id: 'b2', username: 'Blue Two', steamid: '', team: 'blue', avatar: '/api/uploads/b2.jpg', extra: {} },
  { _id: 'b3', username: 'Blue Three', steamid: '', team: 'blue', avatar: '/api/uploads/b3.webp', extra: {} },
  { _id: 'g1', username: 'Gold Four', steamid: '', team: 'gold', avatar: '/api/uploads/g1.png', extra: { observer_slot: 4 } },
  { _id: 'g2', username: 'Gold Five', steamid: '', team: 'gold', avatar: '/api/uploads/g2.png', extra: { observer_slot: 5 } },
  { _id: 'g3', username: 'Gold Six', steamid: '', team: 'gold', avatar: '/api/uploads/g3.png', extra: { observer_slot: 6 } },
  { _id: 'coach', username: 'Coach', steamid: '', team: 'blue', avatar: '', isCoach: true, extra: {} }
];
const match = { left: { id: 'blue' }, right: { id: 'gold' }, vetos: [{ mapName: 'rush_001', reverseSide: false }] };

test('manager match assigns team names, logos and exact SteamID player data', () => {
  const assignments = buildManagerAssignments({ players, teams, match, activeMap: 'workshop/123/rush_001', origin: 'http://localhost:1349' });
  const game = normalize(fixture, null, assignments);
  assert.equal(game.ct.name, 'Blue Team');
  assert.equal(game.t.name, 'Gold Team');
  assert.equal(game.ct.logo, 'http://localhost:1349/api/uploads/blue.png');
  assert.equal(game.ct.players[0].name, 'Blue One');
  assert.equal(game.ct.players[0].avatar, 'http://localhost:1349/api/uploads/b1.png');
  assert.equal(game.observed.name, 'Blue Two');
  assert.equal(game.observed.avatar, 'http://localhost:1349/api/uploads/b2.jpg');
});

test('bots are assigned deterministically by observer slot and team roster order', () => {
  const assignments = buildManagerAssignments({ players, teams, match, activeMap: 'rush_001', origin: 'http://localhost:1349' });
  const raw = [
    { id: 'BOT-Z', name: 'Bot Z', side: 'T', slot: 6 },
    { id: 'BOT-X', name: 'Bot X', side: 'T', slot: 4 },
    { id: 'BOT-Y', name: 'Bot Y', side: 'T', slot: 5 }
  ];
  const assigned = applyManagerAssignments(raw, assignments).sort((a, b) => a.slot - b.slot);
  assert.deepEqual(assigned.map(player => player.name), ['Gold Four', 'Gold Five', 'Gold Six']);
  assert.deepEqual(assigned.map(player => player.avatar.split('/').pop()), ['g1.png', 'g2.png', 'g3.png']);
});

test('reverseSide swaps current-match team assignments for the active map', () => {
  const reversed = structuredClone(match);
  reversed.vetos[0].reverseSide = true;
  const assignments = buildManagerAssignments({ players, teams, match: reversed, activeMap: 'rush_001', origin: 'http://localhost:1349' });
  assert.equal(assignments.teams.CT.name, 'Gold Team');
  assert.equal(assignments.teams.T.name, 'Blue Team');
});

test('manager API loader accepts a match list without a current match', async () => {
  const responses = new Map([
    ['/api/players', { ok: true, status: 200, json: async () => players }],
    ['/api/teams', { ok: true, status: 200, json: async () => teams }],
    ['/api/match', { ok: true, status: 200, json: async () => [] }]
  ]);
  const assignments = await loadManagerAssignments({
    origin: 'http://localhost:1349',
    fetcher: async url => responses.get(url.pathname)
  });
  assert.equal(assignments.teams.CT, null);
  assert.equal(assignments.playersBySteamId.get('ct1').username, 'Blue One');
});

test('all HUD image surfaces use manager logos and portraits', () => {
  const assignments = buildManagerAssignments({ players, teams, match, activeMap: 'rush_001', origin: 'http://localhost:1349' });
  const game = normalize(fixture, null, assignments);
  const theme = {
    portraits: { CT: 'fallback-ct', T: 'fallback-t' }, observedPortraits: { CT: 'fallback-observed-ct', T: 'fallback-observed-t' },
    logos: { CT: 'fallback-logo-ct', T: 'fallback-logo-t' }, icons: {}, weapons: new Map(), radar: { [game.radar.room]: 'radar.png' }
  };
  const html = view(game, { show: true, status: '', preview: false, hidden: false, theme });
  assert.match(html, /Blue Team/);
  assert.match(html, /api\/uploads\/blue\.png/);
  assert.match(html, /api\/uploads\/b1\.png/);
  assert.match(html, /api\/uploads\/b2\.jpg/);
  assert.doesNotMatch(html, /fallback-logo-ct/);
  assert.doesNotMatch(html, /fallback-observed-ct/);
});
