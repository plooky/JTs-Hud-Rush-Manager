import test from 'node:test';
import assert from 'node:assert/strict';
import { CUSTOM_IMAGE_FORMATS, imageDescriptor, resolveIdentityImage } from './theme.mjs';

test('missing and failed identity images fall back without retrying failed URLs', () => {
  const theme = { failedImages: new Set() };
  for (const kind of ['logo', 'portrait']) {
    const custom = `/custom-${kind}.png`;
    const preset = `/preset-${kind}.png`;
    const original = `/default-${kind}.png`;
    assert.equal(resolveIdentityImage(theme, [null, '', ' ', original]), original);
    assert.equal(resolveIdentityImage(theme, [custom, preset, original]), custom);
    theme.failedImages.add(custom);
    assert.equal(resolveIdentityImage(theme, [custom, preset, original]), preset);
    theme.failedImages.add(preset);
    assert.equal(resolveIdentityImage(theme, [custom, preset, original]), original);
    theme.failedImages.add(original);
    assert.equal(resolveIdentityImage(theme, [custom, preset, original]), '');
  }
});

test('custom images accept common Chromium image formats from the custom folder', () => {
  const base = 'http://localhost:1349/huds/rush-hud/index.html';
  for (const extension of CUSTOM_IMAGE_FORMATS) {
    const result = imageDescriptor(`./assets/custom/example.${extension}`, base);
    assert.equal(result.src, `http://localhost:1349/huds/rush-hud/assets/custom/example.${extension}`);
    assert.equal(result.tint, false);
  }
});

test('image entries support direct paths and tint descriptors with spaces', () => {
  const base = 'http://localhost:1349/huds/rush-hud/index.html';
  assert.deepEqual(imageDescriptor('./assets/custom/My Icon.jpg', base), {
    src: 'http://localhost:1349/huds/rush-hud/assets/custom/My%20Icon.jpg', tint: false
  });
  assert.deepEqual(imageDescriptor({ src: './assets/custom/skull.svg', tint: true }, base), {
    src: 'http://localhost:1349/huds/rush-hud/assets/custom/skull.svg', tint: true
  });
  assert.throws(() => imageDescriptor({}, base), /non-empty src path/);
});
