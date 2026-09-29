import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize } from './model.mjs';
import { fixture } from './preview.mjs';
import { view } from './view.mjs';

const theme = {
  logos: { CT: 'ct.png', T: 't.png' },
  portraits: { CT: 'ct-player.png', T: 't-player.png' },
  observedPortraits: { CT: 'ct-observed.png', T: 't-observed.png' },
  icons: {}, radar: { room104: 'radar.png' },
  weapons: new Map(['m4a1_silencer', 'awp', 'usp_silencer', 'ak47', 'galilar', 'glock', 'knife'].map(id => [id, { src: `${id}.svg`, tint: true }]))
};
const options = { show: true, status: '', preview: false, hidden: false, theme };

test('all player cards render their inventory inside the health strip', () => {
  const raw = structuredClone(fixture);
  for (const player of Object.values(raw.allplayers)) {
    player.weapons.pistol = { name: 'weapon_glock', type: 'Pistol', state: 'holstered', ammo_clip: 20, ammo_reserve: 120 };
    player.weapons.knife = { name: 'weapon_knife', type: 'Knife', state: 'holstered' };
  }
  const html = view(normalize(raw), options);
  assert.equal((html.match(/class="card-weapons-section"/g) || []).length, 6);
  assert.equal((html.match(/class="inventory-items"/g) || []).length, 6);
  assert.equal((html.match(/title="Glock-18"/g) || []).length, 14);
  assert.equal((html.match(/title="Knife"/g) || []).length, 14);
});

test('observed ammo is rendered for a gun and omitted for a knife', () => {
  const gun = view(normalize(fixture), options);
  assert.match(gun, /class="ammo_container"/);
  const raw = structuredClone(fixture);
  raw.allplayers.ct2.weapons = { knife: { name: 'weapon_knife', type: 'Knife', state: 'active' } };
  const knife = view(normalize(raw), options);
  assert.doesNotMatch(knife, /class="ammo_container"/);
});
