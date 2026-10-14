// capture.cjs: the stills on the front page's version picker. A few machines in every version, at
// rest, with the page's own type and buttons hidden, saved as WebP in this folder.
//
//   node home/capture.cjs                     the picker's set (MACHINES below) in every version
//   node home/capture.cjs iLoop-real 5 8      one version, some machines (by index)
//
// Needs puppeteer-core (set PUPPETEER to its path if it is not installed here), Google Chrome and cwebp.
'use strict';
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = __dirname;
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const VERSIONS = ['iLoop-real', 'iLoop', 'iLoop-watercolor', 'iLoop-pencil', 'iLoop-graphic', 'iLoop-graphic-clean'];
const SLUGS = ['apple-i', 'apple-ii', 'macintosh-128k', 'powerbook-100', 'imac-g3', 'ipod', 'iphone', 'macbook-air', 'apple-watch', 'apple-m1', 'imac-24', 'macbook-pro-14', 'mac-mini'];
const MACHINES = [1, 2, 6, 11]; // Apple II, Macintosh 128K, iPhone, MacBook Pro 14″
const W = 1200, H = 900; // the page is captured at this size; the stills are this shape (4:3)
const INSET = 24; // trimmed from every edge: no page furniture at the margins
const OUT_W = 640, QUALITY = 68;
// the page's own interface: caption, buttons, rail, hint, YouTube dock, debug readout
const HIDE = '.cap,.tools,.rail,.hint,.yt-dock,.sound-line,.perf,footer{display:none!important}';

async function main() {
  const puppeteer = require(process.env.PUPPETEER || 'puppeteer-core');
  const [only, ...idx] = process.argv.slice(2);
  // a version not built yet is skipped; the front page shows it as in press until its stills exist
  const versions = (only ? [only] : VERSIONS).filter((v) => fs.existsSync(path.join(ROOT, v, 'index.html')));
  const machines = idx.length ? idx.map(Number) : MACHINES;
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--use-angle=metal', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio', `--window-size=${W},${H}`] });
  try {
    for (const v of versions) {
      for (const i of machines) {
        const page = await browser.newPage();
        await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
        // hide the interface before the page lays itself out, so each version frames its machine
        // as if there were no caption
        await page.evaluateOnNewDocument((css) => {
          const add = () => { const s = document.createElement('style'); s.textContent = css; (document.head || document.documentElement).appendChild(s); };
          if (document.documentElement) add(); else document.addEventListener('readystatechange', add, { once: true });
        }, HIDE);
        const url = `file://${ROOT}/${v}/index.html${v === 'iLoop' ? '' : `?at=${i}`}#${SLUGS[i]}`;
        await page.goto(url, { waitUntil: 'load' });
        await new Promise((r) => setTimeout(r, v === 'iLoop-real' ? 7000 : 4500));
        const png = path.join(OUT, `.${v}-${i}.png`);
        await page.screenshot({ path: png });
        await page.close();
        const out = path.join(OUT, `${v.replace(/^iLoop-?/, '') || 'engraving'}-${String(i).padStart(2, '0')}.webp`);
        const ch = Math.round(((W - 2 * INSET) * 3) / 4);
        execFileSync('cwebp', ['-quiet', '-q', String(QUALITY), '-m', '6', '-sharp_yuv', '-crop', String(INSET), String((H - ch) / 2), String(W - 2 * INSET), String(ch), '-resize', String(OUT_W), '0', png, '-o', out]);
        fs.unlinkSync(png);
        process.stdout.write(`${v} ${i} `);
      }
    }
  } finally {
    await browser.close();
  }
  writeManifest();
  console.log('done');
}

// stills.js tells the front page which versions have their full set, so it never asks for a missing
// picture; the others show as in press
function writeManifest() {
  const ready = VERSIONS.map((v) => v.replace(/^iLoop-?/, '') || 'engraving')
    .filter((n) => MACHINES.every((i) => fs.existsSync(path.join(OUT, `${n}-${String(i).padStart(2, '0')}.webp`))));
  fs.writeFileSync(path.join(OUT, 'stills.js'), `// written by capture.cjs: the versions whose stills are in this folder\nwindow.STILLS = ${JSON.stringify(ready)};\n`);
}
if (process.argv[2] === '--manifest') { writeManifest(); process.exit(0); }
if (process.argv[2] !== '--manifest') main().catch((e) => { console.error(e); process.exit(1); });
