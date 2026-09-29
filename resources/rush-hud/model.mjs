import { buildRushRadar, parseVector } from './radar.mjs';
import { applyManagerAssignments, managerTeamForSide } from './assignments.mjs';

// JT sends complete GSI snapshots. Never merge previously/added into current state.
export const number = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
export const display = value => value === null || value === undefined ? '—' : String(value);
export function clock(value) {
  if (value === null || value === undefined || value === '') return '—:—';
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) return '—:—';
  const rounded = Math.ceil(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
}
const weaponNames = { hkp2000: 'P2000', usp_silencer: 'USP-S', m4a1_silencer: 'M4A1-S',
  m4a1: 'M4A4', ak47: 'AK-47', elite: 'Dual Berettas', glock: 'Glock-18',
  hegrenade: 'HE', smokegrenade: 'Smoke', flashbang: 'Flash', incgrenade: 'Incendiary',
  molotov: 'Molotov', knife_t: 'Knife', knife: 'Knife' };
export function weaponName(value) {
  if (typeof value !== 'string') return '—';
  const name = value.replace(/^weapon_/, '');
  return weaponNames[name] || name.replaceAll('_', ' ').toUpperCase();
}
export function rushRoundLabel(map = {}, phase = '') {
  if (map.mode !== 'rush') return '';
  if (map.phase === 'gameover') return 'Match ended';
  if (map.phase === 'warmup' || phase === 'warmup') return 'Warmup';
  const ct = number(map.team_ct?.score), t = number(map.team_t?.score);
  const round = number(map.round);
  // Scores may update before the end-of-round phase has finished.
  if (round === 14 || (ct === 7 && t === 7 && phase !== 'over')) return 'Tiebreak';
  if (Number.isInteger(round) && round >= 0 && round < 14) return `Round ${round + 1}/14`;
  if (round === null && Number.isInteger(ct) && Number.isInteger(t) && ct >= 0 && ct <= 7 && t >= 0 && t <= 7) {
    const next = ct + t + (phase === 'over' ? 0 : 1);
    if (next >= 1 && next <= 14) return `Round ${next}/14`;
  }
  return 'RUSH';
}
const rosterIdentity = player => {
  const sourceName = String(player.sourceName || '').trim().toLocaleLowerCase();
  return player.slot === null || !sourceName
    ? `${player.side}:id:${player.id}`
    : `${player.side}:slot:${player.slot}:name:${sourceName}`;
};
const secondaryTypes = new Set(['Pistol']);
const equipmentTypes = new Set(['Knife', 'Grenade', 'Equipment', 'C4']);
const inventoryRank = weapon => equipmentTypes.has(weapon.type) ? 2 : secondaryTypes.has(weapon.type) ? 1 : 0;
const inventoryCategory = weapon => equipmentTypes.has(weapon.type) ? 'equipment' : secondaryTypes.has(weapon.type) ? 'secondary' : 'primary';
function dedupeRoster(players) {
  const unique = new Map();
  for (const player of players) {
    const key = rosterIdentity(player);
    const existing = unique.get(key);
    if (!existing || (!existing.observed && player.observed) ||
        (!existing.observed && !player.observed && existing.health !== 0 && player.health === 0)) {
      unique.set(key, player);
    }
  }
  return [...unique.values()];
}
export function normalize(payload = {}, previous = null, assignments = null) {
  const map = payload.map || {};
  const isRush = map.mode === 'rush';
  const phase = map.phase === 'gameover' ? 'gameover' : payload.phase_countdowns?.phase || payload.round?.phase || map.phase || 'waiting';
  // RUSH free-camera packets use spectarget rather than the usual player.steamid.
  const observed = String(payload.player?.spectarget ?? payload.player?.steamid ?? '');
  const roster = payload.allplayers && typeof payload.allplayers === 'object' ? payload.allplayers : {};
  let players = Object.entries(roster).filter(([, p]) => p && ['CT', 'T'].includes(p.team))
    .map(([id, p]) => {
      const weapons = Object.values(p.weapons || {}).filter(Boolean);
      const active = weapons.find(w => w.state === 'active');
      const equipment = weapons.map((w, index) => ({
        id: w.name?.replace(/^weapon_/, '') || '', name: weaponName(w.name), type: w.type || '',
        active: w.state === 'active', quantity: number(w.ammo_reserve), index,
        category: inventoryCategory(w)
      })).sort((a, b) => inventoryRank(a) - inventoryRank(b) || a.index - b.index);
      const showsAmmo = !!active && number(active.ammo_clip) !== null && !equipmentTypes.has(active.type);
      return { id, sourceName: p.name || '', name: p.name || 'Unknown player', side: p.team,
        slot: number(p.observer_slot), health: number(p.state?.health), armor: number(p.state?.armor),
        helmet: p.state?.helmet === true, money: number(p.state?.money), roundKills: number(p.state?.round_kills),
        kills: number(p.match_stats?.kills), assists: number(p.match_stats?.assists),
        deaths: number(p.match_stats?.deaths), observed: observed === id,
        position: parseVector(p.position), forward: parseVector(p.forward),
        weapon: weaponName(active?.name), weaponId: active?.name?.replace(/^weapon_/, '') || '',
        ammo: number(active?.ammo_clip), reserve: number(active?.ammo_reserve), showsAmmo,
        flashed: (number(p.state?.flashed) || 0) > 0,
        grenades: equipment.filter(w => w.type === 'Grenade'),
        equipment: equipment.filter(w => w.type !== 'Grenade'), inventoryItems: equipment,
        inventory: equipment.map(w => `${w.id}:${w.active ? 1 : 0}:${w.quantity ?? ''}`) };
    });
  players = dedupeRoster(players)
    .sort((a, b) => (a.slot === 0 ? 10 : a.slot ?? 99) - (b.slot === 0 ? 10 : b.slot ?? 99) || a.id.localeCompare(b.id));
  if (assignments) players = applyManagerAssignments(players, assignments);
  // GSI can briefly omit or replay a dead player's health after the death packet.
  // Keep a confirmed death through the same active round so the card cannot flash alive.
  const sameActiveRound = previous?.isRush && isRush && previous.map === map.name &&
    previous.round === number(map.round) && !['warmup', 'freezetime'].includes(phase);
  if (sameActiveRound) {
    const dead = dedupeRoster([...previous.ct.players, ...previous.t.players].filter(player => player.health === 0));
    const deadById = new Map(dead.map(player => [player.id, player]));
    const deadByRoster = new Map(dead.map(player => [rosterIdentity(player), player]));
    const retained = new Set();
    players = players.map(player => {
      const prior = deadById.get(player.id) || deadByRoster.get(rosterIdentity(player));
      if (!prior) return player;
      retained.add(prior.id);
      return { ...player, id: prior.id, health: 0, observed: player.observed || observed === prior.id };
    });
    for (const player of dead) if (!retained.has(player.id)) {
      players.push({ ...player, observed: observed === player.id });
    }
    players.sort((a, b) => (a.slot === 0 ? 10 : a.slot ?? 99) - (b.slot === 0 ? 10 : b.slot ?? 99) || a.id.localeCompare(b.id));
  }
  const team = side => {
    const data = map[side === 'CT' ? 'team_ct' : 'team_t'] || {};
    const members = players.filter(p => p.side === side);
    const managerTeam = assignments ? managerTeamForSide(side, players, assignments) : null;
    const utility = {};
    let hasUtility = false;
    for (const member of members) for (const grenade of member.grenades) {
      if (grenade.quantity === null) continue;
      utility[grenade.id] = (utility[grenade.id] || 0) + grenade.quantity;
      hasUtility = true;
    }
    return { side, name: managerTeam?.name || data.name || (side === 'CT' ? 'Counter-Terrorists' : 'Terrorists'),
      logo: managerTeam?.logo || '',
      score: number(data.score), players: members,
      alive: members.length && members.every(p => p.health !== null) ? members.filter(p => p.health > 0).length : null,
      timeoutsRemaining: number(data.timeouts_remaining), utility: hasUtility ? utility : null };
  };
  const explicitRoundWinner = ['CT', 'T'].includes(payload.round?.win_team) &&
    (payload.round?.phase === 'over' || phase === 'over') ? payload.round.win_team : null;
  return { isRush, map: map.name || '', winner: rushWinner(payload), round: number(map.round), roundLabel: rushRoundLabel(map, phase), phase, time: clock(payload.phase_countdowns?.phase_ends_in),
    ct: team('CT'), t: team('T'), count: players.length,
    radar: isRush ? buildRushRadar(map.name, players) : null,
    roundWinner: explicitRoundWinner,
    hasRoster: Object.hasOwn(payload, 'allplayers'), observed: players.find(p => p.observed) || null };
}

export function rushWinner(payload = {}) {
  const map = payload.map || {};
  if (map.mode !== 'rush' || map.phase !== 'gameover') return null;
  const ct = number(map.team_ct?.score), t = number(map.team_t?.score);
  if (ct === null || t === null || ct < 0 || t < 0) return null;
  if (ct !== t) return ct > t ? 'CT' : 'T';
  // Some feeds may retain 7-7: use only an explicit completed tiebreak result.
  if (ct === 7 && t === 7 && map.round === 14 && payload.round?.phase === 'over' && ['CT', 'T'].includes(payload.round.win_team)) return payload.round.win_team;
  return null;
}
