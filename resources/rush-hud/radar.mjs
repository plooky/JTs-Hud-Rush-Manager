export const RUSH_RADAR_ROOMS = Object.freeze([
  'room101', 'room102', 'room103', 'room104',
  'room201', 'room202', 'room203', 'room204', 'room205', 'room206',
  'room207', 'room208', 'room209', 'room210', 'room211', 'room212',
  'room301', 'room401', 'roomparty', 'convoy'
]);

// Values ship in CS2's resource/overviews/rush_001.txt.
export const RUSH_RADAR_CONFIG = Object.freeze({
  room104: { posX: 1744, posY: 7836, scale: 2.484375 },
  room101: { posX: 1376, posY: 3520, scale: 1.78125 },
  room102: { posX: 1263, posY: -841, scale: 1.974121 },
  room103: { posX: 1263, posY: -3837, scale: 2.369141 },
  room201: { posX: -1748, posY: -3808, scale: 2.15625 },
  room202: { posX: -4656, posY: -3968, scale: 1.59375 },
  room204: { posX: -10880, posY: -3136, scale: 2.90625 },
  room205: { posX: -2336, posY: -304, scale: 2.375 },
  room206: { posX: -6008, posY: 8, scale: 2.90625 },
  room207: { posX: -10560, posY: -224, scale: 3.15625 },
  room208: { posX: -2464, posY: 3604, scale: 2.453125 },
  room209: { posX: -5504, posY: 3296, scale: 1.59375 },
  room203: { posX: -9400, posY: 3879, scale: 2.647462 },
  room211: { posX: -3104, posY: 7088, scale: 2.40625 },
  room212: { posX: -6176, posY: 7596, scale: 2.297851 },
  room210: { posX: -10088, posY: 7424, scale: 3.859375 },
  room401: { posX: 4544, posY: -528, scale: 2.5 },
  room301: { posX: 4608, posY: 5696, scale: 2.59375 },
  roomparty: { posX: 454, posY: 1184, scale: 1.585938 },
  convoy: { posX: -6720, posY: -5952, scale: 4.562499 }
});

export function parseVector(value) {
  const parts = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  if (parts.length < 2) return null;
  const vector = parts.map(part => Number(String(part).trim()));
  return vector.every(Number.isFinite) ? vector : null;
}

export function worldToRadar(position, config) {
  if (!position || !config) return null;
  return [(position[0] - config.posX) / config.scale, (config.posY - position[1]) / config.scale];
}

const inBounds = ([x, y]) => x >= 0 && x <= 1024 && y >= 0 && y <= 1024;
const outsideDistance = ([x, y]) => {
  const dx = x < 0 ? -x : x > 1024 ? x - 1024 : 0;
  const dy = y < 0 ? -y : y > 1024 ? y - 1024 : 0;
  return dx * dx + dy * dy;
};

export function detectRushRoom(players) {
  const positions = players.map(player => player.position).filter(Boolean);
  if (!positions.length) return null;
  const candidates = RUSH_RADAR_ROOMS.map(room => {
    const projected = positions.map(position => worldToRadar(position, RUSH_RADAR_CONFIG[room]));
    return {
      room,
      inside: projected.filter(inBounds).length,
      outside: projected.reduce((sum, point) => sum + outsideDistance(point), 0),
      center: projected.reduce((sum, [x, y]) => sum + Math.hypot(x - 512, y - 512), 0)
    };
  }).sort((a, b) => b.inside - a.inside || a.outside - b.outside || a.center - b.center);
  return candidates[0].inside >= Math.ceil(positions.length / 2) ? candidates[0].room : null;
}

export function facingAngle(forward) {
  return forward ? Math.atan2(forward[0], forward[1]) * 180 / Math.PI : 0;
}

export function buildRushRadar(mapName, players) {
  if (String(mapName || '').split('/').pop() !== 'rush_001') return null;
  const room = detectRushRoom(players);
  if (!room) return null;
  const config = RUSH_RADAR_CONFIG[room];
  const markers = players.flatMap(player => {
    const point = worldToRadar(player.position, config);
    if (!point || !inBounds(point)) return [];
    return [{
      id: player.id, name: player.name, side: player.side, slot: player.slot, dead: player.health === 0,
      observed: player.observed, x: point[0], y: point[1], facing: facingAngle(player.forward)
    }];
  });
  return { room, label: room === 'convoy' ? 'Tiebreak · Convoy' : room === 'roomparty' ? 'Warmup · Party' : `Room ${room.slice(4)}`, markers };
}
