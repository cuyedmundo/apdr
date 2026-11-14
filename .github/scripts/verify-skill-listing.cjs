const assert = require('node:assert/strict');
const MarkdownIt = require('markdown-it');
const { chromium } = require('playwright');

const repository = process.env.GITHUB_REPOSITORY;
const revision = process.env.GITHUB_SHA;
const site = 'https://www.skills.sh';
const listing = `${site}/${repository}/apdr`;
const raw = `https://raw.githubusercontent.com/${repository}`;
const skillPath = 'skills/apdr';
const asset = `${skillPath}/assets/apdr.webp`;
const imageSource = `${raw}/main/${asset}`;

async function fetchFile(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, `${url} respondió HTTP ${response.status}`);
  return response;
}

function markdownFingerprint({ selectors, html, site }) {
  const blocks = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ul', 'ol', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote']);

  function simplify(node, preserveWhitespace = false) {
    if (node.nodeType === Node.TEXT_NODE) {
      return preserveWhitespace ? node.textContent : node.textContent.replace(/\s+/g, ' ');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const tag = node.localName;
    const attributes = {};
    if (tag === 'a') attributes.href = node.getAttribute('href');
    if (tag === 'img') {
      const source = new URL(node.getAttribute('src'), site);
      const isProxy = source.origin === site && source.pathname === '/api/image-proxy';
      attributes.src = isProxy ? source.searchParams.get('url') : source.href;
      attributes.alt = node.getAttribute('alt');
    }
    if (tag === 'ol' && node.hasAttribute('start')) attributes.start = node.getAttribute('start');

    const children = Array.from(node.childNodes, child => simplify(child, preserveWhitespace || tag === 'pre' || tag === 'code')).filter(child => child !== null);
    if (blocks.has(tag)) {
      if (typeof children[0] === 'string') children[0] = children[0].trimStart();
      if (typeof children.at(-1) === 'string') children[children.length - 1] = children.at(-1).trimEnd();
    }
    const content = children.filter((child, index) => child !== '' && !(child === ' ' && (blocks.has(children[index - 1]?.tag) || blocks.has(children[index + 1]?.tag))));
    return { tag, attributes, children: content };
  }

  const containers = html === undefined
    ? Array.from(document.querySelectorAll(selectors)).filter(node => node.getClientRects().length)
    : [new DOMParser().parseFromString(html, 'text/html').body];
  return containers.flatMap(container => Array.from(container.children, child => simplify(child)));
}

async function verify() {
  const [source, assetResponse] = await Promise.all([
    fetchFile(`${raw}/${revision}/${skillPath}/SKILL.md`).then(response => response.text()),
    fetchFile(`${raw}/${revision}/${asset}`),
  ]);
  const [, header, body] = source.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]+)$/) ?? [];
  assert.ok(header && body, 'El SKILL.md de GitHub no tiene metadatos y contenido');
  assert.match(header, /^name: apdr\r?$/m);
  const version = header.match(/^ +version: "(\d+\.\d+\.\d+)"\r?$/m)?.[1];
  assert.ok(version, 'El SKILL.md de GitHub no tiene una versión válida');
  const title = body.match(/^# (.+)\r?$/m)?.[1];
  assert.ok(title, 'El SKILL.md de GitHub no tiene título');
  const expectedHTML = new MarkdownIt().render(body);

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ locale: 'en-US' });
    page.setDefaultTimeout(15000);
    const response = await page.goto(listing, { waitUntil: 'load', timeout: 30000 });
    assert.equal(response?.status(), 200, 'La ficha canónica de Skills.sh no respondió HTTP 200');
    assert.equal(page.url(), listing, 'Skills.sh redirigió la ficha canónica');

    const main = page.locator('main');
    const name = await main.getByRole('heading', { level: 1 }).first().innerText();
    assert.equal(name.trim(), 'apdr', `La ficha no muestra el identificador apdr: ${name.trim()}`);
    const sourceLink = main.getByRole('link', { name: repository, exact: true });
    assert.ok(await sourceLink.isVisible(), 'La ficha no enlaza el repositorio canónico');
    assert.equal(await sourceLink.getAttribute('href'), `https://github.com/${repository}`, 'El enlace al repositorio difiere de GitHub');
    const installCommand = `npx skills add https://github.com/${repository} --skill apdr`;
    const command = main.locator('button code').filter({ hasText: installCommand }).first();
    assert.ok(await command.isVisible(), 'La ficha no muestra el comando de instalación canónico');
    assert.equal((await command.innerText()).trim().replace(/^\$\s+/, ''), installCommand, 'El comando visible difiere del canónico');

    const showMore = main.getByRole('button', { name: 'Show more', exact: true });
    if (await showMore.isVisible()) {
      const showLess = main.getByRole('button', { name: 'Show less', exact: true });
      await showMore.click();
      try {
        await showLess.waitFor({ timeout: 2500 });
      } catch (error) {
        if (error.name !== 'TimeoutError') throw error;
        // The preview can be visible before its client-side handler is ready.
        if (await showMore.isVisible()) await showMore.click();
        await showLess.waitFor();
      }
    }
    const selectors = 'main .prose';
    const skill = page.locator(selectors);
    const intro = skill.first();
    assert.equal((await intro.getByRole('heading', { level: 1 }).innerText()).trim(), title, 'El título del contenido difiere de GitHub');
    assert.ok((await intro.innerText()).includes(`Versión ${version}.`), `La ficha no muestra la versión ${version}`);

    const actual = await page.evaluate(markdownFingerprint, { selectors, site });
    const expected = await page.evaluate(markdownFingerprint, { html: expectedHTML, site });
    const mismatch = expected.findIndex((block, index) => JSON.stringify(block) !== JSON.stringify(actual[index]));
    assert.equal(mismatch, -1, `El contenido visible difiere de GitHub en el bloque ${mismatch + 1} (${expected[mismatch]?.tag})`);
    assert.equal(actual.length, expected.length, 'La ficha muestra bloques adicionales que difieren de GitHub');

    const image = intro.getByRole('img');
    await image.scrollIntoViewIfNeeded();
    await page.waitForFunction(node => node.complete && node.naturalWidth > 0, await image.elementHandle());
    const displayedImage = new URL(await image.evaluate(node => node.currentSrc));
    const isProxy = displayedImage.origin === site && displayedImage.pathname === '/api/image-proxy';
    const displayedSource = isProxy ? displayedImage.searchParams.get('url') : displayedImage.href;
    assert.equal(displayedSource, imageSource, 'La imagen visible apunta a otra ubicación');
    const renderedImage = await fetchFile(displayedImage.href);
    assert.match(renderedImage.headers.get('content-type') ?? '', /^image\/webp\b/);
    const renderedBytes = Buffer.from(await renderedImage.arrayBuffer());
    const expectedBytes = Buffer.from(await assetResponse.arrayBuffer());
    assert.ok(renderedBytes.equals(expectedBytes), 'La imagen visible difiere del WebP de GitHub');

    console.log(`Ficha actualizada — apdr ${version}, ${actual.length} bloques del SKILL.md y WebP verificados contra ${revision}.`);
  } finally {
    await browser.close();
  }
}

verify().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
