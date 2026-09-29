const empty = () => ({ teams: {}, rosters: { CT: [], T: [] }, playersBySteamId: new Map(), teamsById: new Map() });

const mapName = value => String(value || '').split('/').pop();
const imageUrl = (value, origin) => value ? new URL(value, origin).href : '';
const playerSlot = player => {
  const extra = player?.extra && typeof player.extra === 'object' ? player.extra : {};
  for (const value of [extra.observer_slot, extra.observerSlot, extra.roster_slot, extra.rosterSlot, extra.slot]) {
    const slot = Number(value);
    if (Number.isInteger(slot) && slot >= 0 && slot <= 10) return slot;
  }
  return null;
};

export function buildManagerAssignments({ players = [], teams = [], match = null, activeMap = '', origin = 'http://localhost' } = {}) {
  const result = empty();
  result.teamsById = new Map(teams.map(team => [team._id, { ...team, logo: imageUrl(team.logo, origin) }]));
  const currentVeto = Array.isArray(match?.vetos) ? match.vetos.find(veto => mapName(veto.mapName) === mapName(activeMap)) : null;
  const reversed = currentVeto?.reverseSide === true;
  const sideIds = reversed
    ? { CT: match?.right?.id, T: match?.left?.id }
    : { CT: match?.left?.id, T: match?.right?.id };
  for (const side of ['CT', 'T']) result.teams[side] = result.teamsById.get(sideIds[side]) || null;

  const eligible = players.filter(player => player && !player.isCoach).map((player, index) => ({
    ...player,
    avatar: imageUrl(player.avatar, origin),
    managerOrder: index,
    managerSlot: playerSlot(player)
  }));
  result.playersBySteamId = new Map(eligible.filter(player => player.steamid).map(player => [String(player.steamid), player]));
  for (const side of ['CT', 'T']) {
    const teamId = sideIds[side];
    result.rosters[side] = eligible.filter(player => teamId && player.team === teamId);
  }
  return result;
}

export function applyManagerAssignments(players, assignments = empty()) {
  const assigned = players.map(player => ({ ...player }));
  for (const side of ['CT', 'T']) {
    const sidePlayers = assigned.filter(player => player.side === side)
      .sort((a, b) => (a.slot === 0 ? 10 : a.slot ?? 99) - (b.slot === 0 ? 10 : b.slot ?? 99) || a.id.localeCompare(b.id));
    const roster = assignments.rosters?.[side] || [];
    const used = new Set();
    for (const player of sidePlayers) {
      const exact = assignments.playersBySteamId?.get(String(player.id));
      if (exact && (!assignments.teams?.[side] || exact.team === assignments.teams[side]._id)) {
        player.manager = exact;
        used.add(exact._id);
      }
    }
    for (const player of sidePlayers.filter(player => !player.manager)) {
      let manager = roster.find(candidate => !used.has(candidate._id) && candidate.managerSlot !== null && candidate.managerSlot === player.slot);
      manager ||= roster.find(candidate => !used.has(candidate._id));
      if (manager) {
        player.manager = manager;
        used.add(manager._id);
      }
    }
  }
  return assigned.map(player => player.manager ? {
    ...player,
    name: player.manager.username || player.name,
    avatar: player.manager.avatar || '',
    managerTeamId: player.manager.team || null
  } : player);
}

export function managerTeamForSide(side, players, assignments = empty()) {
  if (assignments.teams?.[side]) return assignments.teams[side];
  const teamId = players.find(player => player.side === side && player.managerTeamId)?.managerTeamId;
  return teamId ? assignments.teamsById?.get(teamId) || null : null;
}

async function json(response, fallback) {
  if (response.status === 404) return fallback;
  if (!response.ok) throw new Error(`JT Hud Manager API returned ${response.status}`);
  return response.json();
}

export async function loadManagerAssignments({ activeMap = '', origin = location.origin, fetcher = fetch } = {}) {
  const [playersResponse, teamsResponse, matchesResponse] = await Promise.all([
    fetcher(new URL('/api/players', origin)),
    fetcher(new URL('/api/teams', origin)),
    fetcher(new URL('/api/match', origin))
  ]);
  const matches = await json(matchesResponse, []);
  return buildManagerAssignments({
    players: await json(playersResponse, []),
    teams: await json(teamsResponse, []),
    match: Array.isArray(matches) ? matches.find(match => match.current) || null : null,
    activeMap,
    origin
  });
}

export function emptyManagerAssignments() { return empty(); }
