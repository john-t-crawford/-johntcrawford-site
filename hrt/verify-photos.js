#!/usr/bin/env node
/* ================================================================
   verify-photos.js — audits photos-manifest.json before you build.

   Checks every entry that has a src:
     - the URL resolves (HEAD, following redirects)
     - the response is actually an image, and how large it is
     - a credit exists (an uncredited CC BY image is a licence breach)
     - the licence is safe for redistribution

   Licence policy, strictest first:
     CLEAN   public domain, PD-USGov, CC0        — no obligation
     ATTRIB  CC BY                                — credit required, fine
     VIRAL   CC BY-SA, GFDL                       — share-alike propagates
                                                    to your file
     BLOCKED CC BY-NC, "educational use only",
             Bugwood / Forestry Images / IPM      — not redistributable

   Run:  node verify-photos.js
   Exit code is non-zero if anything is BLOCKED or unreachable, so it
   drops straight into a pre-commit hook.
   ================================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const MANIFEST = path.join(__dirname, 'photos-manifest.json');
const TIMEOUT = 12000;
const MAX_BYTES = 220 * 1024;

const CLEAN = /public domain|pd-usgov|pd-us|\bcc0\b|no rights reserved/i;
const VIRAL = /by-sa|share.?alike|gfdl|free documentation/i;
const BLOCKED = /\bnc\b|non.?commercial|educational use|bugwood|forestry ?images|ipm ?images|all rights reserved/i;
const ATTRIB = /\bcc ?by\b|creative commons attribution/i;

function classify(license) {
  const L = license || '';
  if (!L.trim()) return 'UNSET';
  if (BLOCKED.test(L)) return 'BLOCKED';
  if (VIRAL.test(L)) return 'VIRAL';
  if (CLEAN.test(L)) return 'CLEAN';
  if (ATTRIB.test(L)) return 'ATTRIB';
  return 'UNKNOWN';
}

function head(url, depth) {
  depth = depth || 0;
  return new Promise(resolve => {
    if (depth > 5) return resolve({ ok: false, why: 'too many redirects' });
    let lib;
    try { lib = new URL(url).protocol === 'http:' ? http : https; }
    catch (e) { return resolve({ ok: false, why: 'malformed URL' }); }
    const req = lib.request(url, { method: 'HEAD', timeout: TIMEOUT }, res => {
      const loc = res.headers.location;
      if (res.statusCode >= 300 && res.statusCode < 400 && loc) {
        return resolve(head(new URL(loc, url).toString(), depth + 1));
      }
      resolve({
        ok: res.statusCode === 200,
        status: res.statusCode,
        type: res.headers['content-type'] || '',
        bytes: parseInt(res.headers['content-length'] || '0', 10)
      });
    });
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, why: 'timed out' }); });
    req.on('error', e => resolve({ ok: false, why: e.code || e.message }));
    req.end();
  });
}

(async function () {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const meta = manifest.photos || {};
  const problems = [], notes = [];
  const tally = { CLEAN: 0, ATTRIB: 0, VIRAL: 0, BLOCKED: 0, UNKNOWN: 0, UNSET: 0 };
  let checked = 0, populated = 0;

  for (const id of Object.keys(meta)) {
    for (const row of meta[id]) {
      if (!row.src || !row.src.trim()) continue;
      populated++;
      const where = `${id} [${row.view || 'foliage'}]`;
      const cls = classify(row.license);
      tally[cls]++;

      if (cls === 'BLOCKED') problems.push(`${where}: licence not redistributable — "${row.license}"`);
      if (cls === 'VIRAL') notes.push(`${where}: share-alike propagates to your file — "${row.license}"`);
      if (cls === 'UNSET') problems.push(`${where}: no licence recorded`);
      if (cls === 'UNKNOWN') notes.push(`${where}: unrecognised licence "${row.license}" — check by hand`);
      if (!row.credit || !row.credit.trim()) problems.push(`${where}: no credit recorded`);

      if (/^data:/.test(row.src)) { notes.push(`${where}: already inlined, skipping reachability`); continue; }
      const r = await head(row.src.trim());
      checked++;
      if (!r.ok) { problems.push(`${where}: unreachable — ${r.why || 'HTTP ' + r.status}`); continue; }
      if (!/^image\//.test(r.type)) problems.push(`${where}: served ${r.type || 'no content-type'}, not an image`);
      else if (r.bytes > MAX_BYTES) notes.push(`${where}: ${Math.round(r.bytes / 1024)} KB — resize to ~800px`);
    }
  }

  console.log(`\n${populated} populated entries across ${Object.keys(meta).length} specimens; ${checked} URLs reached`);
  console.log('licences: ' + Object.keys(tally).filter(k => tally[k]).map(k => `${k} ${tally[k]}`).join('  ') || 'none');
  if (notes.length) { console.log(`\n${notes.length} note${notes.length === 1 ? '' : 's'}:`); notes.forEach(n => console.log('  - ' + n)); }
  if (problems.length) {
    console.log(`\n${problems.length} problem${problems.length === 1 ? '' : 's'}:`);
    problems.forEach(p => console.log('  ! ' + p));
    console.log('');
    process.exit(1);
  }
  console.log('\nNo problems. Safe to run build-photos.js.\n');
})();
