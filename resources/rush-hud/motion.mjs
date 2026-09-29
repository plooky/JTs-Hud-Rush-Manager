// Keep live elements in place so countdown updates do not restart transitions.
export function updateMarkup(parent, html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  syncChildren(parent, template.content);
}
function syncChildren(parent, desired) {
  let cursor = parent.firstChild;
  for (const next of [...desired.childNodes]) {
    const key = next.nodeType === 1 ? next.getAttribute('data-key') : null;
    let current = key
      ? [...parent.children].find(node => node.getAttribute('data-key') === key)
      : cursor;
    if (!current || current.nodeType !== next.nodeType || current.nodeName !== next.nodeName ||
        (!key && current.nodeType === 1 && current.hasAttribute('data-key'))) {
      current = next.cloneNode(true);
      parent.insertBefore(current, cursor);
    } else {
      if (current !== cursor) parent.insertBefore(current, cursor);
      if (next.nodeType === 1) {
        for (const attr of [...current.attributes]) {
          if (!next.hasAttribute(attr.name)) current.removeAttribute(attr.name);
        }
        for (const attr of next.attributes) {
          if (current.getAttribute(attr.name) !== attr.value) current.setAttribute(attr.name, attr.value);
        }
        syncChildren(current, next);
      } else if (current.nodeValue !== next.nodeValue) current.nodeValue = next.nodeValue;
    }
    cursor = current.nextSibling;
  }
  while (cursor) {
    const next = cursor.nextSibling;
    cursor.remove();
    cursor = next;
  }
}

// Only compare consecutive live snapshots of the same map/round/team.
export function changes(previous, current) {
  if (!previous?.isRush || !current.isRush || previous.map !== current.map ||
      previous.round !== current.round || previous.ct.score !== current.ct.score || previous.t.score !== current.t.score) return [];
  const old = new Map([...previous.ct.players, ...previous.t.players].map(p => [p.id, p]));
  return [...current.ct.players, ...current.t.players].flatMap(p => {
    const before = old.get(p.id);
    if (!before || before.side !== p.side || before.health === null || p.health === null || p.health >= before.health) return [];
    return [{ id: p.id, damage: before.health - p.health, died: p.health === 0 }];
  });
}

export function presentationChanges(previous, current) {
  const initial = !previous?.isRush && current?.isRush;
  if (!current?.isRush) return { initial: false, players: [] };
  const oldPlayers = new Map(previous?.isRush ? [...previous.ct.players, ...previous.t.players].map(p => [p.id, p]) : []);
  const players = [...current.ct.players, ...current.t.players].map(player => {
    const before = oldPlayers.get(player.id);
    return {
      id: player.id,
      dead: player.health === 0,
      entered: !before,
      died: !!before && before.health !== 0 && player.health === 0,
      revived: !!before && before.health === 0 && (player.health ?? 0) > 0,
      stats: !!before && ['kills', 'deaths', 'money'].some(key => before[key] !== player[key]),
      equipment: !!before && (before.weaponId !== player.weaponId || before.ammo !== player.ammo || before.reserve !== player.reserve || before.inventory.join('|') !== player.inventory.join('|')),
      roundKills: !!before && before.roundKills !== player.roundKills
    };
  });
  const comparable = previous?.isRush && previous.map === current.map;
  return {
    initial, players,
    phase: comparable && previous.phase !== current.phase,
    round: comparable && previous.round !== current.round,
    observed: comparable && previous.observed?.id !== current.observed?.id,
    observedVitals: comparable && current.observed && previous.observed?.id === current.observed.id && (previous.observed.health !== current.observed.health || previous.observed.armor !== current.observed.armor),
    radar: comparable && previous.radar?.room !== current.radar?.room,
    scores: comparable ? ['ct', 't'].filter(side => previous[side].score !== current[side].score) : [],
    teams: comparable && (previous.ct.name !== current.ct.name || previous.t.name !== current.t.name)
  };
}
