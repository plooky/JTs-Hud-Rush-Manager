import test from 'node:test';
import assert from 'node:assert/strict';
import { CUSTOM_IMAGE_FORMATS, imageDescriptor } from './theme.mjs';

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
