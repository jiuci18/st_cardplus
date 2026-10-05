import assert from 'node:assert/strict';
import { test } from 'node:test';
import { prefixPreviewCss } from '../../src/components/regex/regexPreview.ts';

test('prefixes compound, grouped and pseudo-class selectors', () => {
  assert.equal(
    prefixPreviewCss('.panel.active > .title, :is(.panel, .card):not(.hidden) { color: red; }'),
    '.custom-panel.custom-active>.custom-title,:is(.custom-panel,.custom-card):not(.custom-hidden){color:red}'
  );
});

test('handles nested rules, media queries, supports selectors and layers', () => {
  assert.equal(
    prefixPreviewCss(`
      @layer preview {
        @media (min-width: 600px) {
          .panel { &.active { opacity: .5; } }
        }
      }
      @supports selector(:has(.card)) { .card { display: grid; } }
    `),
    '@layer preview{@media (min-width:600px){.custom-panel{&.custom-active{opacity:.5}}}}' +
      '@supports selector(:has(.custom-card)){.custom-card{display:grid}}'
  );
});

test('does not replace declaration contents, IDs, tags, variables or keyframes', () => {
  assert.equal(
    prefixPreviewCss(`
      #panel, body, .panel {
        --label: ".panel";
        content: ".panel";
        background: url("https://example.com/panel.png");
        animation: panel 1s;
      }
      @keyframes panel { from { opacity: 0.5; } to { opacity: 1; } }
    `),
    '#panel,body,.custom-panel{--label: ".panel";content:".panel";' +
      'background:url(https://example.com/panel.png);animation:panel 1s}' +
      '@keyframes panel{from{opacity:0.5}to{opacity:1}}'
  );
});

test('handles escaped and non-ASCII class names', () => {
  assert.equal(
    prefixPreviewCss(String.raw`.hover\:card, .w-1\/2, .\31 23, .面板 { color: red; }`),
    String.raw`.custom-hover\:card,.custom-w-1\/2,.custom-123,.custom-面板{color:red}`
  );
});

test('updates exact class attributes without changing unrelated attributes', () => {
  assert.equal(
    prefixPreviewCss('[class~="panel"], [class="panel active"], [class=card], [data-label=".panel"] { color: red }'),
    '[class~="custom-panel"],[class="custom-panel custom-active"],[class="custom-card"],[data-label=".panel"]{color:red}'
  );
});

test('leaves already-prefixed names unchanged', () => {
  assert.equal(
    prefixPreviewCss('.panel, .custom-panel { color: red }'),
    '.custom-panel,.custom-panel{color:red}'
  );
});

test('empty CSS produces no copyable content', () => {
  assert.equal(prefixPreviewCss(' /* nothing here */ '), '');
});

test('reports invalid CSS instead of passing through unprocessed selectors', () => {
  assert.throws(() => prefixPreviewCss('.panel { color red; }'));
});
