import { generate, ident, parse, walk } from 'css-tree';

const CLASS_PREFIX = 'custom-';

// Always prefix, so "panel" and an existing "custom-panel" remain distinct.
function prefixClassName(name: string): string {
  return `${CLASS_PREFIX}${name}`;
}

function prefixClassList(value: string): string {
  return value.replace(/[^\t\n\f\r ]+/g, prefixClassName);
}

/** Transform selectors, never declaration values, URLs, IDs or animation names. */
export function prefixPreviewCss(css: string): string {
  const ast = parse(css, {
    onParseError(error) {
      throw error;
    },
  });

  walk(ast, (node) => {
    if (node.type === 'ClassSelector') {
      node.name = ident.encode(prefixClassName(ident.decode(node.name)));
    } else if (
      node.type === 'AttributeSelector' &&
      ident.decode(node.name.name).toLowerCase() === 'class' &&
      node.value &&
      (node.matcher === '=' || node.matcher === '~=')
    ) {
      // Exact class lists and token selectors must follow the HTML class rename.
      const value = node.value.type === 'String' ? node.value.value : ident.decode(node.value.name);
      node.value = { type: 'String', value: prefixClassList(value) };
    }
  });

  return generate(ast);
}

export interface RegexPreview {
  html: string;
  css: string;
}

/** Only the preview is transformed; the source regex/replacement is never changed. */
export function prepareRegexPreview(html: string): RegexPreview {
  // Template contents are inert while we update both CSS and HTML before rendering.
  const template = document.createElement('template');
  template.innerHTML = html;

  template.content.querySelectorAll('[class]').forEach((element) => {
    element.setAttribute('class', prefixClassList(element.getAttribute('class') || ''));
  });

  const styles: string[] = [];
  template.content.querySelectorAll('style').forEach((style) => {
    const type = style.getAttribute('type');
    if (type && type.toLowerCase() !== 'text/css') return;
    const css = prefixPreviewCss(style.textContent || '');
    style.textContent = css;
    if (css) {
      styles.push(style.media ? `@media ${style.media}{${css}}` : css);
    }
  });

  return { html: template.innerHTML, css: styles.join('\n\n') };
}
