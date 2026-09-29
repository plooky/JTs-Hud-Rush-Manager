import { RUSH_RADAR_ROOMS } from './radar.mjs';

// Reuse the manager's installed default theme rather than redistribute its bundle.
export const CUSTOM_IMAGE_FORMATS = ['svg', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'bmp', 'ico'];

export function imageDescriptor(value, baseURL) {
  const config = typeof value === 'string' ? { src: value } : value;
  if (!config || typeof config.src !== 'string' || !config.src.trim()) throw new Error('Custom image entries need a non-empty src path');
  return { src: new URL(config.src, baseURL).href, tint: config.tint === true };
}

export async function loadDefaultTheme() {
  const base = new URL('/huds/default/index.html', location.origin);
  const response = await fetch(base);
  if (!response.ok) throw new Error('Default JT HUD is unavailable');
  const page = new DOMParser().parseFromString(await response.text(), 'text/html');
  const css = page.querySelector('link[rel="stylesheet"][href*="assets/"]');
  const script = page.querySelector('script[type="module"][src]');
  if (!css || !script) throw new Error('Default JT HUD theme format is unsupported');
  const cssURL = new URL(css.getAttribute('href'), base);
  const cssResponse = await fetch(cssURL);
  if (!cssResponse.ok) throw new Error('Default JT HUD stylesheet could not load');
  const style = document.createElement('style');
  style.dataset.defaultJtTheme = 'true';
  // Use the original rules, with local Oswald replacing the external font import.
  style.textContent = (await cssResponse.text()).replace(/@import[^;]+;/g, '')
    .replace(/url\(([^)]+)\)/g, (_, value) => `url("${new URL(value.trim().replace(/^["']|["']$/g, ''), cssURL).href}")`);
  document.head.insertBefore(style, document.querySelector('link[href="style.css"]'));
  const scriptURL = new URL(script.getAttribute('src'), base);
  const bundleResponse = await fetch(scriptURL);
  if (!bundleResponse.ok) throw new Error('Default JT HUD assets are unavailable');
  const bundle = await bundleResponse.text();
  const asset = prefix => {
    const name = bundle.match(new RegExp(`${prefix}-[a-zA-Z0-9_-]+\\.png`))?.[0];
    if (!name) throw new Error(`Default JT HUD asset ${prefix} is unavailable`);
    return new URL(name, scriptURL).href;
  };
  const weapons = await fetch('./assets/weapons.json').then(r => r.json());
  const images = await fetch('./images.json', { cache: 'no-store' }).then(r => {
    if (!r.ok) throw new Error('Image configuration could not load');
    return r.json();
  });
  const descriptor = value => imageDescriptor(value, location.href);
  const imageURL = (value, fallback) => descriptor(value || fallback).src;
  const portraits = { CT: imageURL(images.portraits?.CT, asset('default_CT')), T: imageURL(images.portraits?.T, asset('default_T')) };
  return {
    portraits,
    observedPortraits: Object.fromEntries(['CT', 'T'].map(side => [side, imageURL(images.observedPortraits?.[side], portraits[side])])),
    logos: { CT: imageURL(images.logos?.CT, asset('logo_CT_default')), T: imageURL(images.logos?.T, asset('logo_T_default')) },
    radar: Object.fromEntries(RUSH_RADAR_ROOMS.map(room => [room, imageURL(images.radar?.[room], `./assets/radar/${room}.png`)])),
    icons: Object.fromEntries(Object.entries(images.icons || {}).map(([key, value]) => [key, descriptor(value)])),
    weapons: new Map([
      ...weapons.map(id => [id, descriptor({ src: `./assets/weapons/${id}.svg`, tint: true })]),
      ...Object.entries(images.weapons || {}).map(([id, value]) => [id, descriptor(value)])
    ])
  };
}
