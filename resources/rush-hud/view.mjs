import { display } from './model.mjs';
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const stat = value => escape(display(value));
const money = value => value === null ? '—' : `$${value.toLocaleString('en-US')}`;
const hp = p => Math.max(0, Math.min(100, p.health ?? 0));
const icon = (name, theme) => {
  const image = theme.icons[name];
  if (!image) return '';
  const src = escape(image.src.replaceAll("'", '%27'));
  return image.tint ? `<span class="hud-icon" aria-hidden="true" style="--icon:url('${src}')"></span>` : `<img class="hud-icon image-icon" src="${src}" alt="">`;
};
function weapon(id, name, theme) {
  const image = theme.weapons.get(id);
  return image ? `<img class="weapon ${image.tint ? 'tint' : ''}" src="${escape(image.src)}" alt="${escape(name)}" title="${escape(name)}">` : `<span class="weapon-fallback fit-text" data-min-size="11">${escape(name)}</span>`;
}
function killCard(p, theme) {
  return p.roundKills > 0 ? `<div data-key="round-kills" class="round_kills_card" title="Kills this round"><div class="card_corner top_left">${icon('kills', theme)}</div><div class="card_center"><div class="count">${stat(p.roundKills)}</div></div><div class="card_corner bottom_right">${icon('kills', theme)}</div></div>` : '';
}
function playerCard(p, theme) {
  const dead = p.health === 0;
  return `<article data-key="player-${escape(p.id)}" class="player-horizontal-container ${dead ? 'dead' : ''}">
    <div class="player-horizontal-card vertical-flow ${p.observed ? 'active' : ''}">
      <span class="damage-indicator" aria-hidden="true"></span>${killCard(p, theme)}
      <div class="card-avatar-section ${p.flashed ? 'flashed' : ''}"><div class="avatar">${dead ? icon('skull', theme) : `<img src="${escape(theme.portraits[p.side])}" alt="">`}</div><span class="slot-pill ${p.side}">${stat(p.slot === 0 ? 10 : p.slot)}</span></div>
      <div class="card-info-section"><div class="username-row"><strong class="name fit-text" data-min-size="11">${escape(p.name)}</strong><div class="health-armor-group" title="Armor ${stat(p.armor)}${p.helmet ? ', helmet' : ''}"><span class="armor-container">${p.armor > 0 ? icon(p.helmet ? 'helmet' : 'armor', theme) : ''}</span><span class="health-text">${stat(p.health)}</span></div></div>
        <div class="stats-row"><div class="stat-group" title="Kills / deaths"><span class="stat-item">${icon('kills', theme)}${stat(p.kills)}</span><span class="stat-item">${icon('skull', theme)}${stat(p.deaths)}</span></div><span class="money">${money(p.money)}</span></div>
      </div>
      <div class="card-weapons-section"><div class="health-bar-red" style="width:${hp(p)}%"></div><div class="health-bar" style="width:${hp(p)}%"></div><div class="equipment-strip">${p.equipment.map(item => `<span class="${item.active ? 'active' : ''}">${weapon(item.id, item.name, theme)}</span>`).join('')}</div><div class="grenade-strip">${p.grenades.map(g => `<span class="${g.active ? 'active' : ''}">${weapon(g.id, g.name, theme)}${g.quantity !== null && g.quantity > 1 ? `<b>${g.quantity}</b>` : ''}</span>`).join('')}</div></div>
    </div>
  </article>`;
}
const utilityOrder = ['flashbang', 'smokegrenade', 'hegrenade', 'molotov', 'incgrenade'];
function utilityPanel(team, theme, position, visible) {
  const items = utilityOrder.filter(id => (team.utility?.[id] || 0) > 0).map(id => `<span class="utility-item"><span class="utility-item-icon">${weapon(id, id, theme)}</span><strong>${team.utility[id]}</strong></span>`).join('');
  return `<section data-key="utility-${team.side}" class="team-econ-panel ${visible ? 'show' : 'hide'} ${team.side} ${position}"><div class="team-econ-header"><span class="title">TEAM UTILITY</span><div class="utility-summary-row ${team.side}">${items || '<span class="utility-none">None reported</span>'}</div></div></section>`;
}
function roundWin(game, theme) {
  const visible = game.phase === 'over' && game.roundWinner;
  const team = game.roundWinner === 'T' ? game.t : game.ct;
  return `<section data-key="round-win" class="win_announcement ${visible ? 'show' : 'hide'} ${team.side}" aria-live="polite" aria-hidden="${visible ? 'false' : 'true'}"><div class="win_content"><div class="team_logo_container"><img src="${escape(theme.logos[team.side])}" alt=""></div><div class="win_text_container"><strong class="team_name fit-text" data-min-size="18">${escape(team.name)}</strong><span class="win_caption">WINS THE ROUND!</span></div></div></section>`;
}
function interruption(game, theme) {
  const paused = game.phase === 'paused';
  const timeout = ['timeout_ct', 'timeout_t'].includes(game.phase);
  const team = game.phase === 'timeout_t' ? game.t : game.ct;
  return `<section data-key="pause" id="pause" class="${paused ? 'show' : 'hide'}" aria-hidden="${paused ? 'false' : 'true'}"><div class="pause-content"><div class="pause-icon">Ⅱ</div><div class="pause-text-container"><strong class="pause-main-text">MATCH PAUSED</strong><span class="pause-sub-text">Waiting for play to resume</span></div></div></section><section data-key="timeout" id="timeout" class="${timeout ? 'show' : 'hide'} ${team.side}" aria-hidden="${timeout ? 'false' : 'true'}"><div class="timeout-header"><div class="team-logo-container"><img src="${escape(theme.logos[team.side])}" alt=""></div><div class="timeout-info"><strong class="timeout-title fit-text" data-min-size="14">${escape(team.name)} TIMEOUT</strong><span class="timeout-timer">${escape(game.time)}</span></div></div>${team.timeoutsRemaining === null ? '' : `<div class="timeout-footer"><span class="timeouts-remaining">${team.timeoutsRemaining} TIMEOUT${team.timeoutsRemaining === 1 ? '' : 'S'} REMAINING</span></div>`}</section>`;
}
function roster(team, theme, position) {
  return `<section data-key="roster-${team.side}" class="teambox layout-horizontal ${team.side} ${position}" aria-label="${escape(team.name)} roster">${team.players.map(p => playerCard(p, theme)).join('')}${Array.from({ length: Math.max(0, 3 - team.players.length) }, (_, i) => `<div data-key="empty-${i}" class="empty-player">Waiting for player</div>`).join('')}</section>`;
}
function teamHeader(team, theme, position, show) {
  return `<div class="team ${position} ${team.side}"><div class="score-container"><div class="score ${team.side}">${show ? stat(team.score) : '—'}</div></div><div class="team-name"><span class="fit-text" data-min-size="16">${escape(team.name)}</span></div><div class="logo"><img src="${escape(theme.logos[team.side])}" alt="${team.side}"></div></div>`;
}
function radar(game, theme) {
  if (!game.radar) return '';
  const background = escape(theme.radar[game.radar.room].replaceAll("'", '%27'));
  const markers = game.radar.markers.map(marker => {
    const slot = marker.slot === 0 ? 10 : marker.slot;
    return `<div data-key="radar-player-${escape(marker.id)}" class="radar-player ${marker.side} ${marker.dead ? 'dead' : ''} ${marker.observed ? 'active' : ''}" style="left:${marker.x / 10.24}%;top:${marker.y / 10.24}%;--facing:${marker.facing}deg" title="${escape(marker.name)}"><span class="radar-facing"></span><strong>${stat(slot)}</strong></div>`;
  }).join('');
  return `<aside data-key="radar" class="rush-radar" aria-label="RUSH ${escape(game.radar.label)} radar"><div class="radar-map"><div class="radar-surface" style="background-image:url('${background}')" aria-hidden="true"></div>${markers}</div></aside>`;
}
function resultTeam(team, game, theme) {
  return `<section class="eg-team-column ${team.side} ${game.winner === team.side ? 'winner' : ''}"><div class="eg-team-header"><img class="result-logo" src="${escape(theme.logos[team.side])}" alt=""><strong class="eg-team-name fit-text" data-min-size="18">${escape(team.name)}</strong><span class="eg-team-score">${stat(team.score)}</span></div><div class="eg-stat-labels"><span class="eg-player-name-label">PLAYER</span><span class="eg-stat-label">K</span><span class="eg-stat-label">A</span><span class="eg-stat-label">D</span></div><div class="eg-player-list">${[...team.players].sort((a, b) => (b.kills ?? -1) - (a.kills ?? -1)).map((p, i) => `<div data-key="result-${escape(p.id)}" class="eg-player-row" style="animation-delay:${.6 + i * .07}s"><span class="eg-player-name fit-text" data-min-size="16">${escape(p.name)}</span><span class="eg-stat">${stat(p.kills)}</span><span class="eg-stat">${stat(p.assists)}</span><span class="eg-stat eg-deaths">${stat(p.deaths)}</span></div>`).join('')}</div></section>`;
}
function resultScreen(game, theme) {
  const winner = game.winner === 'CT' ? game.ct : game.winner === 'T' ? game.t : null;
  return `<section data-key="results" class="eg-overlay" aria-label="RUSH match result"><div class="eg-header"><div class="eg-winner-line">${winner ? `<span class="eg-winner-name ${winner.side} fit-text" data-min-size="24">${escape(winner.name)}</span><span class="eg-wins-text">wins RUSH</span>` : '<span class="eg-wins-text">RUSH match ended</span>'}</div></div>${!winner ? '<div class="result-pending">Waiting for a confirmed winning team</div>' : ''}<div class="eg-teams">${resultTeam(game.ct, game, theme)}<div class="eg-divider"></div>${resultTeam(game.t, game, theme)}</div></section>`;
}
export function view(game, { show, status, preview, hidden, theme, results = false, settings = {} }) {
  const p = game.observed;
  const tournament = [settings.tournament_name, settings.tournament_stage].filter(Boolean);
  const stageClasses = [hidden ? 'hidden' : '', settings.disable_team_models ? 'models-disabled' : '', settings.use_advertisement ? 'advertisement-gap' : ''].filter(Boolean).join(' ');
  return `<div class="stage ${stageClasses}">
    ${show && results ? resultScreen(game, theme) : ''}
    <header data-key="scoreboard" id="matchbar" class="${settings.compact_matchbar && game.phase === 'live' ? 'compact-rush' : ''}">${teamHeader(game.ct, theme, 'left', show)}<div id="timer"><div id="round_now">${show ? escape(game.roundLabel) : 'RUSH'}</div><div id="round_timer_text">${show ? game.time : '—:—'}</div></div>${teamHeader(game.t, theme, 'right', show)}${tournament.length ? `<div id="tournament_info" class="show"><span class="tournament_name">${escape(settings.tournament_name || '')}</span>${tournament.length > 1 ? '<span class="tournament_separator">·</span>' : ''}<span class="tournament_stage">${escape(settings.tournament_stage || '')}</span></div>` : ''}</header>
    ${show ? roundWin(game, theme) + interruption(game, theme) : ''}
    ${show ? radar(game, theme) : ''}
    ${show ? `<div data-key="utility-panels" class="matchbar-team-panels">${utilityPanel(game.ct, theme, 'left', game.phase === 'freezetime' && !!game.ct.utility)}<div class="matchbar-panel-spacer"></div>${utilityPanel(game.t, theme, 'right', game.phase === 'freezetime' && !!game.t.utility)}</div>` : ''}
    ${status ? `<div data-key="status" class="status">${escape(status)}</div>` : ''}
    ${preview ? '<div data-key="preview" class="preview-tag">PREVIEW · SYNTHETIC TEST DATA</div>' : ''}
    ${show ? roster(game.ct, theme, 'left') + roster(game.t, theme, 'right') : ''}
    ${show && p ? `<section data-key="observed" class="observed ${p.side}">${killCard(p, theme)}<div class="avatar_container"><div class="avatar"><img src="${escape(theme.observedPortraits[p.side])}" alt=""></div></div><div class="main_container"><div class="health_armor_container"><div class="health_armor_icon">${p.armor > 0 ? icon(p.helmet ? 'helmet' : 'armor', theme) : ''}</div><div class="health_value">${stat(p.health)}</div></div><div class="info_container"><strong class="username fit-text" data-min-size="12">${escape(p.name)}</strong></div><div class="weapon_container"><div class="ammo_container"><div class="ammo_values"><span class="clip">${stat(p.ammo)}</span><span class="divider">/</span><span class="reserve">${stat(p.reserve)}</span></div><span class="ammo_icon">${icon('bullets', theme)}</span></div></div></div><div class="health_bar_container"><div class="health-bar-red" style="width:${hp(p)}%"></div><div class="health_bar_bg" style="width:${hp(p)}%"></div></div><div class="observed-inventory">${p.equipment.map(item => `<span class="${item.active ? 'active' : ''}">${weapon(item.id, item.name, theme)}</span>`).join('')}${p.grenades.map(item => `<span>${weapon(item.id, item.name, theme)}</span>`).join('')}</div></section>` : ''}
  </div>`;
}
