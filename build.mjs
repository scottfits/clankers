#!/usr/bin/env node
// Gives every episode its own page, e.g. clankers.fm/riemann, and tells the home page where they are.
//
//   node build.mjs
//
// It reads the podcast feed and the YouTube playlist, so a new episode gets a page without anyone
// touching this repo: a GitHub Action (.github/workflows/episode-pages.yml) runs this every few hours
// and commits whatever changed.
//
// It writes:
//   <slug>/index.html   one page per episode in the feed
//   show.js             the same settings and episodes, for the home page to load
//   show.json           only to add what it found: a new episode, its date, its video id, its chapters
//
// show.json is the file to edit by hand. Each episode there can have:
//   slug        its address. "riemann" gives clankers.fm/riemann. A new episode gets one made from its
//               title; shorten it before you share the link, because the old address stops working.
//   date        when it came out. Written by this script from the feed; there is no need to set it.
//   youtube     the video id. Found in the playlist by matching the title. Set it here if that misses.
//   spotify     the episode's open.spotify.com link.
//   chapters    ["00:00 Title", ...]. Copied once from the YouTube description. Delete them to copy again.
//   paragraphs  the description. Leave it out to use the one in the feed.
//   made        paragraphs for a "How it was made" section. Backticks make `code`, and
//               [some words](https://...) make a link.
//   extra       things hand-made for the episode, shown under the video: one name, or a list of them in the
//               order they should appear. Each is a script, extras/<name>.js. An episode's walkthrough is
//               one of these, named after its slug. extras/walk.js says how to write one.
// Anything written in show.json is used in place of what the feeds say. Title, date and audio always
// come from the podcast feed.
// The script also keeps each episode's "date" there, to tell when the feed it was handed is an old copy.

import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const at = (...p) => path.join(ROOT, ...p);
// Every page this script writes carries this line. It is how the script knows a folder is its own.
const MARK = '<meta name="generator" content="build.mjs">';

/* ---- Small helpers ---- */
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Hand-written text can carry `code` and [a link](https://example.com). Links open in a new tab.
const rich = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
const key = t => (t || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const safeUrl = u => (/^https?:\/\//i.test(u || '') ? u : '');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…' };
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] !== '#') return NAMED[e.toLowerCase()] ?? m;
  const n = /^#x/i.test(e) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
  return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
});

const toSeconds = v => String(v || '').split(':').reduce((acc, part) => acc * 60 + (parseFloat(part) || 0), 0);
function clock(t) {
  const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = Math.floor(t % 60);
  return (h ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
const dateText = iso => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '');
function clip(s, max) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:.]+$/, '') + '…';
}
const slugify = t => (t || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/['’]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');

async function get(url, method = 'GET') {
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch(url, { method, headers: { 'user-agent': 'Mozilla/5.0 (compatible; feed-reader)' }, signal: AbortSignal.timeout(20000) });
      if (method === 'HEAD') return r.status;
      if (!r.ok) throw new Error('it answered ' + r.status);
      return await r.text();
    } catch (err) {
      if (attempt >= 3) throw new Error(`Could not read ${url}: ${err.message}`);
      await sleep(2000 * attempt);
    }
  }
}

/* ---- Reading the feeds ---- */
// The text of the first <name> tag, out of its CDATA wrapper or its escaping.
function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  if (!m) return '';
  const cdata = m[1].match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return (cdata ? cdata[1] : decode(m[1])).trim();
}
function linesOfHtml(html) {
  return decode(html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '').replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n').replace(/<[^>]+>/g, ''));
}
// "(12:26) Why a trillion checked zeros isn't proof" is a chapter. A line that is only a link is dropped. The rest is the description.
const CHAPTER = /^\(?((?:\d{1,2}:)?\d{1,2}:\d{2})\)?\s*[-–:]?\s*(\S.*)$/;
const chapterOf = line => { const m = String(line).trim().match(CHAPTER); return m ? [toSeconds(m[1]), m[2]] : null; };
function readText(text) {
  const out = { paragraphs: [], chapters: [] };
  text.split(/\n+/).map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean).forEach(line => {
    const c = chapterOf(line);
    if (c) out.chapters.push(c);
    else if (!/^([\w ]{1,24}:\s*)?https?:\/\/\S+$/.test(line)) out.paragraphs.push(line);
  });
  return out;
}
function parsePodcast(xml) {
  return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/g)].map(([, it]) => {
    const html = tag(it, 'content:encoded') || tag(it, 'description');
    const enclosure = it.match(/<enclosure\b[^>]*\surl="([^"]+)"/);
    const date = new Date(tag(it, 'pubDate'));
    const yt = html.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
    const sp = html.match(/https:\/\/open\.spotify\.com\/episode\/[A-Za-z0-9]+/);
    return {
      guid: tag(it, 'guid'),
      title: tag(it, 'title'),
      date: isNaN(date) ? '' : date.toISOString(),
      number: parseInt(tag(it, 'itunes:episode'), 10) || 0,
      trailer: tag(it, 'itunes:episodeType') === 'trailer',
      audio: safeUrl(enclosure ? decode(enclosure[1]) : ''),
      link: safeUrl(tag(it, 'link')),
      youtube: yt ? yt[1] : '',
      spotify: sp ? sp[0] : '',
      ...readText(linesOfHtml(html))
    };
  }).filter(ep => ep.title);
}
// The feed comes through a cache. For a while after an episode goes up, the cache can still hand back the copy
// from before, and that copy would take the new episode's page down. A copy put together before an episode
// came out can't be the one that removed it, so it is asked for again. If that is all there is, the script
// stops and every page stays up. `known` is the episodes in show.json.
async function readFeed(url, known) {
  for (let attempt = 1; ; attempt++) {
    const xml = await get(url);
    const items = parsePodcast(xml);
    const built = Date.parse(tag(xml, 'lastBuildDate'));
    const lost = known.find(n => n.guid && built < Date.parse(n.date || '') && !items.some(f => f.guid === n.guid));
    if (!lost) return items;
    const what = `The feed came back as a copy from before "${lost.title}" came out`;
    if (attempt >= 4) throw new Error(`${what}, ${attempt} times. Nothing was changed.`);
    console.warn(`${what}. Asking again.`);
    await sleep(5000 * attempt);
  }
}
function parsePlaylist(xml) {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => ({
    id: tag(e, 'yt:videoId'),
    title: tag(e, 'title'),
    chapters: readText(tag(e, 'media:description')).chapters
  })).filter(v => /^[\w-]{11}$/.test(v.id));
}
// The largest thumbnail a video has. Not every video gets the big one.
async function posterFor(id) {
  const big = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
  const status = await get(big, 'HEAD');
  if (status === 200) return big;
  if (status === 404) return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  throw new Error(`Could not check the thumbnail for ${id}: it answered ${status}`);
}

/* ---- One episode's page ---- */
const ICON_SVG = {
  youtube: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
  spotify: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/></svg>',
  apple: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/></svg>',
  rss: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 11a8 8 0 0 1 8 8M5 5a14 14 0 0 1 14 14"/><circle cx="6" cy="18" r="1.6" fill="currentColor" stroke="none"/></svg>'
};

// What runs on an episode page. The page reads fine without it: the video is a link to YouTube and so are the chapters.
const PAGE_SCRIPT = `
(function () {
  var YT = 'https://www.youtube-nocookie.com';
  var facade = document.querySelector('a.player'), frame = null;
  // YouTube only plays inside a page it can identify: a real web address, opened directly.
  // A file opened from disk, or a page shown inside another page's preview pane, keeps the play box that links out.
  if (facade && /^https?:$/.test(location.protocol) && window.top === window.self) {
    frame = document.createElement('iframe');
    frame.className = 'player';
    frame.id = 'player';
    frame.title = facade.dataset.title;
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    // The video starts on its own, muted, because browsers don't let a page start sound. It stays still for
    // anyone who has asked their device for less motion.
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    frame.src = YT + '/embed/' + facade.dataset.yt + '?enablejsapi=1&playsinline=1' + (still ? '' : '&autoplay=1&mute=1') +
      '&origin=' + encodeURIComponent(location.origin);
    facade.replaceWith(frame);
    document.addEventListener('securitypolicyviolation', function (e) {
      if (frame && /youtube/.test(e.blockedURI || '')) { frame.replaceWith(facade); frame = null; }
    });
  }

  // A chapter moves the player on this page to that moment and starts it, with the sound on.
  var audio = document.querySelector('audio');
  function tell(func, args) { frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func: func, args: args }), YT); }
  document.querySelectorAll('.chapters a').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var t = +a.dataset.t, player = frame || audio;
      if (!player) return;
      e.preventDefault();
      if (frame) { tell('seekTo', [t, true]); tell('unMute', []); tell('playVideo', []); }
      else { audio.currentTime = t; audio.play(); }
      player.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  // The picture icons from show.json, where they load. Otherwise the plain ones stay.
  document.querySelectorAll('.ico[data-img]').forEach(function (plain) {
    var img = new Image();
    img.alt = '';
    img.referrerPolicy = 'no-referrer';
    img.onload = function () { plain.replaceWith(img); };
    img.src = plain.dataset.img;
  });
})();
`.trim();

function page(ep, show) {
  const url = `${show.site}/${ep.slug}`;
  const label = [ep.trailer ? 'Trailer' : (ep.number ? `Episode ${ep.number}` : ''), dateText(ep.date)].filter(Boolean).join(', ');
  const summary = clip(ep.paragraphs[0] || `${label || 'An episode'} of ${show.name}.`, 220);
  const watch = ep.youtube ? `https://www.youtube.com/watch?v=${ep.youtube}` : '';

  const player = ep.youtube
    ? `<a class="player" id="player" href="${watch}" rel="noopener" aria-label="${esc('Play ' + ep.title + ' on YouTube')}" data-yt="${ep.youtube}" data-title="${esc(ep.title)}" style="background-image:url(${esc(ep.poster)})"></a>`
    : (ep.audio ? `<audio id="player" controls preload="none" src="${esc(ep.audio)}"></audio>` : '');

  const boxLink = (kind, href, text) =>
    `      <a href="${esc(href)}" rel="noopener"><span class="ico"${show.icons?.[kind] ? ` data-img="${esc(show.icons[kind])}"` : ''}>${ICON_SVG[kind]}</span>${esc(text)}</a>`;
  const box = [];
  if (watch) box.push(boxLink('youtube', watch, 'Watch on YouTube'));
  if (ep.spotify) box.push(boxLink('spotify', ep.spotify, 'Listen on Spotify'));
  else if (ep.link) box.push(boxLink('spotify', ep.link, /spotify/.test(ep.link) ? 'Listen on Spotify' : 'Listen'));
  if (show.links?.apple) box.push(boxLink('apple', show.links.apple, 'Apple Podcasts'));
  if (show.feed) box.push(boxLink('rss', show.feed, 'RSS feed'));

  const ld = {
    '@context': 'https://schema.org', '@type': 'PodcastEpisode', name: ep.title, url, description: summary,
    datePublished: ep.date ? ep.date.slice(0, 10) : undefined, episodeNumber: ep.number || undefined,
    partOfSeries: { '@type': 'PodcastSeries', name: show.name, url: show.site + '/' }
  };

  const sections = [];
  if (ep.extras.length) sections.push(`  <section class="wrap extras">
${ep.extras.map(x => `    <div data-extra="${x}"></div>`).join('\n')}
  </section>`);
  if (ep.made.length) sections.push(`  <section class="wrap block" id="made">
    <h2 id="how">How it was made</h2>
    <div class="copy">
${ep.made.map(p => `      <p>${rich(p)}</p>`).join('\n')}
    </div>
  </section>`);
  if (ep.paragraphs.length || ep.chapters.length) sections.push(`  <section class="wrap block" id="chapters">
    <h2>In this episode</h2>${ep.paragraphs.length ? `
    <div class="copy">
${ep.paragraphs.map(p => `      <p>${esc(p)}</p>`).join('\n')}
    </div>` : ''}${ep.chapters.length ? `
    <ol class="chapters">
${ep.chapters.map(([t, title]) => `      <li><a href="${watch ? `${watch}&amp;t=${t}s` : '#player'}"${watch ? ' rel="noopener"' : ''} data-t="${t}"><time>${clock(t)}</time><span>${esc(title)}</span></a></li>`).join('\n')}
    </ol>` : ''}
  </section>`);
  sections.push(`  <section class="wrap block" id="watch">
    <h2>Where to watch</h2>${box.length ? `
    <div class="ep-box">
${box.join('\n')}
    </div>` : ''}
    <p class="back">${esc(show.name)} is an animated podcast series where I ask Claude to teach me about breakthroughs in AI, startups, science, math, and history. <a href="../">See all the episodes.</a></p>
  </section>`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(ep.title)} | ${esc(show.name)}</title>
<meta name="description" content="${esc(summary)}">
${MARK}
<link rel="canonical" href="${esc(url)}">
<meta name="theme-color" content="#f4ecd8">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(show.name)}">
<meta property="og:title" content="${esc(ep.title)}">
<meta property="og:description" content="${esc(summary)}">
<meta property="og:url" content="${esc(url)}">${ep.poster ? `
<meta property="og:image" content="${esc(ep.poster)}">
<meta name="twitter:card" content="summary_large_image">` : ''}
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23f4ecd8'/%3E%3Ctext x='32' y='47' text-anchor='middle' font-family='Georgia,serif' font-style='italic' font-weight='700' font-size='46' fill='%238f530a'%3EC%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;800&display=swap">
<link rel="stylesheet" href="../site.css">
<script type="application/ld+json">
${JSON.stringify(ld).replace(/</g, '\\u003c')}
</script>
</head>
<body class="page">

<header class="wrap top">
  <a class="site" href="../">clankers podcast</a>
  <nav aria-label="Site">
    <a href="../#episodes">Episodes</a>
    <a href="../#about">About</a>
  </nav>
</header>

<main>

  <section class="wrap page-head">
    <h1>${esc(ep.title)}</h1>${label ? `
    <p class="ep-meta">${esc(label)}</p>` : ''}${player ? `
    ${player}` : ''}
  </section>

${sections.join('\n\n')}

</main>

<footer>
  <div class="wrap">${esc(show.name)}, ${ep.date ? ep.date.slice(0, 4) : new Date().getUTCFullYear()}</div>
</footer>

<script>
${PAGE_SCRIPT}
</script>${ep.extras.map(x => `
<script src="../extras/${x}.js" defer></script>`).join('')}
</body>
</html>
`;
}

/* ---- Putting it together ---- */
const showFile = at('show.json');
const showBefore = await readFile(showFile, 'utf8');
const show = JSON.parse(showBefore);
const notes = (show.episodes ||= []);
if (!show.feed) throw new Error('show.json has no "feed".');

const feed = (await readFeed(show.feed, notes)).sort((a, b) => new Date(a.date) - new Date(b.date));
// An empty feed is a broken feed. Stopping here keeps every page that is already up.
if (!feed.length) throw new Error('The feed has no episodes. Nothing was changed.');

const playlistId = ((show.links?.youtube || '').match(/[?&]list=([\w-]+)/) || [])[1];
let videos = [];
if (playlistId) {
  // The playlist only fills in what show.json is missing, and what it finds is kept there, so a miss here costs nothing.
  try { videos = parsePlaylist(await get(`https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`)); }
  catch (err) { console.warn(`${err.message}. Carrying on without the playlist.`); }
}

const isOurs = dir => existsSync(at(dir, 'index.html')) && readFileSync(at(dir, 'index.html'), 'utf8').includes(MARK);
const blocked = slug => existsSync(at(slug)) && !isOurs(slug);
const taken = new Set();
for (const n of notes) {
  if (!n.slug) continue;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(n.slug)) throw new Error(`"${n.slug}" can't be an address. Use lowercase letters, numbers and dashes.`);
  if (taken.has(n.slug)) throw new Error(`Two episodes in show.json share the slug "${n.slug}".`);
  if (blocked(n.slug)) throw new Error(`The slug "${n.slug}" is the name of something else in this folder.`);
  taken.add(n.slug);
}

const episodes = [];
for (const f of feed) {
  const k = key(f.title);
  let n = notes.find(x => x.guid && x.guid === f.guid) || notes.find(x => !x.guid && key(x.title) === k);
  if (!n) { n = {}; notes.push(n); console.log(`New episode: ${f.title}`); }

  // The address and the number are settled the first time an episode is seen, and kept.
  if (!n.slug) {
    const base = slugify(f.title) || 'episode';
    let slug = base;
    for (let i = 2; taken.has(slug) || blocked(slug); i++) slug = `${base}-${i}`;
    taken.add(slug);
    n.slug = slug;
  }
  if (!n.number && !f.trailer) n.number = f.number || Math.max(0, ...notes.map(x => x.number || 0)) + 1;
  n.title = f.title;
  if (f.date) n.date = f.date;
  if (f.guid) n.guid = f.guid;

  const video = videos.find(v => key(v.title) === k)
    || videos.find(v => { const a = key(v.title); return k.length >= 12 && a.length >= 12 && (a.includes(k) || k.includes(a)); });
  if (!n.youtube && (f.youtube || video)) n.youtube = f.youtube || video.id;
  if (!n.spotify && f.spotify) n.spotify = f.spotify;
  if (!n.chapters?.length) {
    const found = f.chapters.length ? f.chapters : (video ? video.chapters : []);
    if (found.length) n.chapters = found.map(([t, title]) => `${clock(t)} ${title}`);
  }
  if (n.youtube && !/^[\w-]{11}$/.test(n.youtube)) throw new Error(`"${n.youtube}" is not a YouTube video id (${f.title}).`);
  const extras = [].concat(n.extra || []);
  for (const x of extras) if (!(/^[\w-]+$/.test(x) && existsSync(at('extras', x + '.js')))) throw new Error(`There is no extras/${x}.js (${f.title}).`);

  episodes.push({
    slug: n.slug, number: n.number || 0, trailer: f.trailer, title: f.title, date: f.date, guid: f.guid,
    youtube: n.youtube || '', spotify: n.spotify || '', link: f.link, audio: f.audio,
    poster: n.youtube ? await posterFor(n.youtube) : '',
    paragraphs: n.paragraphs?.length ? n.paragraphs : f.paragraphs,
    chapters: (n.chapters || []).map(chapterOf).filter(Boolean),
    made: n.made || [], extras
  });
}

for (const ep of episodes) {
  await mkdir(at(ep.slug), { recursive: true });
  await writeFile(at(ep.slug, 'index.html'), page(ep, show));
  console.log(`/${ep.slug}  ${ep.title}`);
}
// A page whose episode has left the feed, or been given a new slug, goes away.
const live = new Set(episodes.map(ep => ep.slug));
for (const d of await readdir(ROOT, { withFileTypes: true })) {
  if (d.isDirectory() && !d.name.startsWith('.') && !live.has(d.name) && isOurs(d.name)) {
    await rm(at(d.name), { recursive: true });
    console.log(`Removed /${d.name}. No episode has that address now.`);
  }
}

// The home page shows these before the feed loads, newest first, and uses them to link each episode to its page.
const home = {
  feed: show.feed, links: show.links || {}, icons: show.icons || {},
  episodes: episodes.slice().reverse().map(ep => ({
    slug: ep.slug, number: ep.number, trailer: ep.trailer, title: ep.title, date: ep.date, guid: ep.guid,
    youtube: ep.youtube, spotify: ep.spotify, link: ep.link, audio: ep.audio,
    paragraphs: ep.paragraphs, chapters: ep.chapters, extra: ep.extras, made: ep.made.length > 0
  }))
};
await writeFile(at('show.js'), `// Made by build.mjs from show.json and the feeds. Edit show.json, not this file.\nwindow.SHOW = ${JSON.stringify(home, null, 1)};\n`);

const showAfter = JSON.stringify(show, null, 2) + '\n';
if (showAfter !== showBefore) { await writeFile(showFile, showAfter); console.log('Updated show.json with what the feeds added.'); }
