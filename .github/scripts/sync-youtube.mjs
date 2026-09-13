#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Synchronisation automatique · chaîne YouTube → site EIPV
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Lit la chaîne @kossifrancoisabama9052 via l'API YouTube Data v3, repère les
 *  vidéos qui ne sont pas encore sur le site et les ajoute aux 3 tableaux
 *  répartis dans 5 fichiers (voir .github/RUNBOOK-videos.md).
 *
 *  Usage :
 *      YOUTUBE_API_KEY=... node .github/scripts/sync-youtube.mjs [--dry-run]
 *
 *  --dry-run : affiche ce qui serait publié sans toucher aux fichiers.
 *
 *  Le script est volontairement PRUDENT : en cas de doute il n'écrit rien et
 *  sort en erreur, plutôt que d'abîmer une page. Il n'invente jamais de
 *  métadonnée : titre, date et durée viennent tous de l'API.
 */

import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";

/* ── Réglages ─────────────────────────────────────────────────────────────── */

const CHANNEL_ID = "UCx8fhVM8QYd3gwl9tJMwZnQ";
const UPLOADS_PLAYLIST = "UU" + CHANNEL_ID.slice(2);
const API = "https://www.googleapis.com/youtube/v3";

/** Une vidéo publiée il y a moins de 3 h peut être un direct encore en cours. */
const MIN_AGE_HOURS = 3;
/** En dessous de 3 min, c'est une annonce ou un extrait, pas un message. */
const MIN_DURATION_SECONDS = 180;
/** Nombre de vidéos remontées par l'API à chaque passage. */
const FETCH_COUNT = 25;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DRY_RUN = process.argv.includes("--dry-run");
const KEY = process.env.YOUTUBE_API_KEY;

const HOME_PAGES = ["index.html", "fr/index.html", "en/index.html"];
/** Cartes vedettes en dur sur l'accueil, puis grille YouTube générée en JS. */
const FEATURED_COUNT = 3;
const GRID_COUNT = 4;

/* ── Petites aides ────────────────────────────────────────────────────────── */

const read = (f) => readFileSync(resolve(ROOT, f), "utf8");
const write = (f, s) => writeFileSync(resolve(ROOT, f), s);
const eolOf = (s) => (s.includes("\r\n") ? "\r\n" : "\n");
const fail = (msg) => {
  console.error("ERREUR : " + msg);
  process.exit(1);
};

const dateFr = (iso) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    .format(new Date(iso + "T12:00:00Z"));
const dateEn = (iso) =>
  new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" })
    .format(new Date(iso + "T12:00:00Z"));

/* ── 1. Lecture de la chaîne ──────────────────────────────────────────────── */

async function api(path, params) {
  const url = new URL(API + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", KEY);
  const res = await fetch(url);
  const body = await res.text();
  if (!res.ok) throw new Error(`API YouTube ${res.status} · ${body.slice(0, 400)}`);
  return JSON.parse(body);
}

async function fetchChannel() {
  const list = await api("/playlistItems", {
    part: "contentDetails",
    playlistId: UPLOADS_PLAYLIST,
    maxResults: String(FETCH_COUNT),
  });
  const ids = list.items.map((i) => i.contentDetails.videoId);
  const details = await api("/videos", {
    part: "snippet,contentDetails,status",
    id: ids.join(","),
  });
  return details.items;
}

/* ── 2. Filtrage ──────────────────────────────────────────────────────────── */

const TEASER = /\b(extrait|short|teaser|bande[- ]annonce|preview)\b/i;

function classify(video, knownIds, now) {
  const id = video.id;
  if (knownIds.has(id)) return { keep: false, why: "déjà sur le site" };

  if (video.snippet.liveBroadcastContent !== "none")
    return { keep: false, why: `direct ${video.snippet.liveBroadcastContent} (pas encore terminé)` };
  if (video.status?.uploadStatus !== "processed")
    return { keep: false, why: `non finalisée par YouTube (${video.status?.uploadStatus})` };

  const ageH = (now - new Date(video.snippet.publishedAt)) / 3.6e6;
  if (ageH < MIN_AGE_HOURS)
    return { keep: false, why: `publiée il y a ${ageH.toFixed(1)} h · reprise au prochain passage` };

  const seconds = durationSeconds(video.contentDetails.duration);
  if (seconds < MIN_DURATION_SECONDS)
    return { keep: false, why: `trop courte (${formatDuration(seconds)})` };
  if (TEASER.test(video.snippet.title)) return { keep: false, why: "extrait / teaser" };

  return { keep: true };
}

/* ── 3. Métadonnées ───────────────────────────────────────────────────────── */

function durationSeconds(iso) {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || "");
  if (!m) return 0;
  return (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0);
}

function formatDuration(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/**
 * La date affichée est celle inscrite par le pasteur dans le titre quand elle
 * y figure (elle correspond au culte), sinon la date de mise en ligne.
 * Une vidéo publiée à 23 h le lendemain garde ainsi la date du culte.
 */
function pickDate(video) {
  const m = /(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})/.exec(video.snippet.title);
  const uploaded = video.snippet.publishedAt.slice(0, 10);
  if (!m) return uploaded;
  const iso = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  if (Number.isNaN(Date.parse(iso))) return uploaded;
  // Garde-fou : une date de titre aberrante (faute de frappe) est ignorée.
  const drift = Math.abs(new Date(iso) - new Date(uploaded)) / 864e5;
  return drift <= 10 ? iso : uploaded;
}

/** Mots qui reprennent leur casse propre après la mise en casse de phrase. */
const PROPER = [
  "Dieu", "Jésus", "Christ", "Seigneur", "Saint-Esprit", "Esprit Saint", "Parole",
  "Église", "Éternel", "Israël", "Sion", "COMECTO", "EIPV", "SKP", "Shammah",
  "Kabowd", "Power", "Apothéose", "Convention", "Édition", "Janvier", "Février",
  "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre",
  "Novembre", "Décembre", "Jour", "Section", "Partie",
];

/** Signature du pasteur telle qu'elle apparaît en fin de titre, toutes variantes. */
const SIGNATURE =
  /(?:Avec\s+)?(?:L['’])?\s*Ap[oô]tre\b[\s.,]*(?:ABAMA)?[\s.,]*(?:Kossi)?[\s.,]*(?:Fran[cç]ois)?/gi;

/*
 * Le nom du pasteur apparaît parfois SEUL, sans « Apôtre » devant :
 * « la Voix de la Restauration II ABAMA Kossi François II, Apôtre ABAMA… ».
 * SIGNATURE ne retire que la mention précédée d'« Apôtre » ; ce segment-là
 * survivait et devenait un morceau de titre.
 * Vu en vrai le 09/09/2026 : le site affichait
 * « La voix de la restauration · Abama kossi françois ».
 */
const NAME_ONLY =
  /(?:ABAMA|Kossi|Fran.ois)(?:[\s.,]*(?:ABAMA|Kossi|Fran.ois))+/gi;

/**
 * Mots que la chaîne écrit sans accent ou mal orthographiés : on rétablit
 * l'orthographe du site. Le pasteur tape ses titres vite, sur téléphone ; le
 * site, lui, doit rester impeccable. On ne corrige que des fautes évidentes et
 * confirmées, jamais le sens : « Pillers » → « Piliers » (validé le 13/09/2026).
 */
const ACCENTS = [
  [/\bpillers?\b/gi, "piliers"],
  [/\bconference\b/gi, "Conférence"], [/\bapotheose\b/gi, "Apothéose"],
  [/\bedition\b/gi, "Édition"], [/\baout\b/gi, "Août"], [/\bfevrier\b/gi, "Février"],
  [/\bdecembre\b/gi, "Décembre"], [/\bpriere\b/gi, "prière"], [/\bverite\b/gi, "vérité"],
  [/\bfidelite\b/gi, "fidélité"], [/\bdelivrance\b/gi, "délivrance"],
  [/\bcelebrer\b/gi, "célébrer"], [/\bstrategie\b/gi, "stratégie"],
  [/\bprosperite\b/gi, "prospérité"], [/\bsuccess?e?s\b/gi, "succès"],
];

/*
 * Le pasteur commence parfois une formule qu'il ne termine pas avant le
 * séparateur : « VOIX DE LA RESTAURATION AVEC II Apôtre… ». Une fois la
 * signature retirée, ce mot reste seul en fin de titre et n'a plus de sens.
 * Vu en vrai le 02/09/2026 : le site affichait « Voix de la restauration avec ».
 */
const DANGLING =
  /\s+(?:avec|de|du|des|et|ou|pour|dans|sur|par|chez|sans|sous|vers|entre|a|à|au|aux|le|la|les|un|une|l'|d')$/i;

function cleanTitle(raw) {
  let t = raw.replace(/\s+/g, " ").trim();

  t = t.replace(SIGNATURE, " ");
  t = t.replace(NAME_ONLY, " "); // le nom sans « Apôtre » devant
  t = t.replace(/\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}/g, " "); // dates, même collées
  t = t.replace(/(\d)(?=(?:II|ll)(?:[\s,.;:]|$))/g, "$1 "); // « Jour 1II » → « Jour 1 II »
  t = t.replace(/(^|\s)(?:II|ll)(?=[\s,.;:!?]|$)/g, "$1·"); // séparateur maison de la chaîne
  t = t.replace(/\s+(?=(?:JOUR|Jour|jour|SECTION|Section|PARTIE|Partie|DAY|Day)\s*\d)/gi, " · ");
  t = t.replace(/\bDay\s*(\d+)/gi, "Jour $1"); // la chaîne alterne français et anglais

  const parts = t
    .split("·")
    .map((p) =>
      p
        .replace(/^[\s.,;:·|-]+/, "")
        .replace(/[\s.,;:·|-]+$/, "")
        .replace(/\s+(?:II|ll)$/, "") // séparateur resté collé en fin de segment
        .replace(DANGLING, "") // mot en suspens : « … RESTAURATION AVEC II … »
        .trim()
    )
    .filter((p) => p && !/^(?:ii|ll|\d)$/i.test(p))
    .map(sentenceCase);

  return parts.join(" · ") || raw.trim();
}

function sentenceCase(s) {
  let out = s.toLocaleLowerCase("fr-FR");
  for (const [re, to] of ACCENTS) out = out.replace(re, to);
  out = out.charAt(0).toLocaleUpperCase("fr-FR") + out.slice(1);
  for (const word of PROPER) {
    out = out.replace(
      new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&")}\\b`, "gi"),
      word
    );
  }
  return out;
}

/** Rubrique du site, déduite du titre. Réutilise les catégories existantes. */
const CATEGORIES = [
  [/\bjeunes?\b|convention/i, "Jeunesse"],
  [/comecto|conf[ée]rence/i, "Conférence"],
  [/shammah|kabowd|gloire/i, "Gloire"],
  [/famille|foyer|mariage|couple|parent/i, "Famille"],
  [/louange|adoration|joie|c[ée]l[ée]br/i, "Louange"],
  [/pri[èe]re|inter?c[ée]ssion/i, "Prière"],
  [/victoire|domination|r[ée]ussite|succ[èe]s|strat[ée]gie/i, "Victoire"],
  [/v[ée]rit[ée]/i, "Vérité"],
  [/protection|d[ée]livrance/i, "Protection"],
  [/esprit|paraclet|pentec[ôo]te/i, "Esprit Saint"],
  [/alliance/i, "Alliance"],
  [/restauration/i, "Restauration"],
  [/prosp[ée]rit[ée]|b[ée]n[ée]diction/i, "Prospérité"],
  [/invitation|annonce|bienvenue|programme/i, "Annonce"],
];

const pickCategory = (title) =>
  (CATEGORIES.find(([re]) => re.test(title)) || [null, "Parole"])[1];

/** Chapô des cartes vedettes, par rubrique. FR et EN écrits ensemble. */
const BLURBS = {
  Jeunesse: ["Un temps fort de la convention des jeunes.", "A highlight of the youth convention."],
  Conférence: ["Une session de la conférence.", "A session from the conference."],
  Gloire: ["Une soirée de gloire et de puissance.", "An evening of glory and power."],
  Famille: ["La Parole de Dieu pour le foyer.", "God's Word for the home."],
  Louange: ["Un temps de louange et d'adoration.", "A time of praise and worship."],
  Prière: ["Un temps de prière et d'intercession.", "A time of prayer and intercession."],
  Victoire: ["La Parole qui conduit à la victoire.", "The Word that leads to victory."],
  Vérité: ["La vérité de la Parole de Dieu.", "The truth of God's Word."],
  Protection: ["La protection de Dieu sur les siens.", "God's protection over His own."],
  "Esprit Saint": ["L'œuvre du Saint-Esprit dans le croyant.", "The Holy Spirit's work in the believer."],
  Alliance: ["Vivre dans l'alliance de Dieu.", "Living in God's covenant."],
  Restauration: ["Le temps de la restauration.", "The season of restoration."],
  Prospérité: ["La bénédiction de Dieu sur votre vie.", "God's blessing over your life."],
  Annonce: ["Une annonce de l'église.", "A church announcement."],
  Parole: [
    "Un message de l'Apôtre Kossi François ABAMA.",
    "A message from Apostle Kossi François ABAMA.",
  ],
};

/** Rubriques en anglais (celles qui existaient déjà sont déjà dans le fichier). */
const CATEGORY_EN = {
  Jeunesse: "Youth", Conférence: "Conference", Gloire: "Glory", Famille: "Family",
  Louange: "Worship", Prière: "Prayer", Victoire: "Victory", Vérité: "Truth",
  Protection: "Protection", "Esprit Saint": "Holy Spirit", Alliance: "Covenant",
  Restauration: "Restoration", Prospérité: "Prosperity", Annonce: "Announcement",
  Parole: "The Word",
};

/** Traduction mécanique des motifs récurrents des titres de série. */
const TITLE_PATTERNS = [
  [/\bJour\s*(\d+)/gi, "Day $1"],
  [/\bPartie\s*(\d+)/gi, "Part $1"],
  [/\bSection\s*(\d+)/gi, "Section $1"],
  [/\bApothéose\b/gi, "Grand Finale"],
  [/\bÉdition\b/gi, "Edition"],
  [/\bConvention annuelle des jeunes\b/gi, "Annual Youth Convention"],
  [/\bConférence\b/gi, "Conference"],
];

/** Renvoie [titreEN, traduitEntièrement?]. */
function translateTitle(fr) {
  let en = fr;
  for (const [re, to] of TITLE_PATTERNS) en = en.replace(re, to);
  const stillFrench = /\b(de|des|du|la|le|les|pour|une?|dans|sur|par|et|à|au|aux)\b/i.test(en);
  return [en, !stillFrench];
}

/* ── 3 bis. Doublons de rediffusion ───────────────────────────────────────── */

/*
 * Le pasteur republie souvent le même culte deux ou trois fois : le direct est
 * coupé puis relancé, ce qui donne plusieurs vidéos de même titre et même jour.
 * On compare : (1) la date affichée, (2) le jeu de chiffres du titre — c'est lui
 * qui distingue « Jour 1 · Partie 2 » de « Jour 1 » — et (3) le recouvrement des
 * mots. Sur une correspondance, on ne garde que la vidéo mise en ligne en
 * dernier, qui est en général l'enregistrement complet.
 */

const strip = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function fingerprint(title, iso) {
  const flat = strip(title);
  return {
    iso,
    words: new Set(flat.match(/[a-z]{3,}/g) || []),
    numbers: (flat.match(/\d+/g) || []).sort().join(","),
  };
}

function sameBroadcast(a, b) {
  if (a.iso !== b.iso || a.numbers !== b.numbers) return false;
  const [small, big] = a.words.size <= b.words.size ? [a.words, b.words] : [b.words, a.words];
  if (!small.size) return false;
  let shared = 0;
  for (const w of small) if (big.has(w)) shared++;
  return shared / small.size >= 0.75;
}

/* ── 4. Écriture dans les fichiers ────────────────────────────────────────── */

function arrayBlock(src, header) {
  const i = src.indexOf(header);
  if (i < 0) throw new Error(`« ${header} » introuvable`);
  const start = i + header.length;
  const nl = src.indexOf("\n];", start);
  if (nl < 0) throw new Error(`fin du tableau « ${header} » introuvable`);
  const end = src[nl - 1] === "\r" ? nl - 1 : nl; // le corps n'emporte pas le \r final
  return { start, end, body: src.slice(start, end) };
}

/** Insère une ligne avant la première vidéo plus ancienne (ordre antichrono). */
function insertByDate(body, line, iso, eol) {
  const lines = body.split(/\r?\n/);
  let at = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const m = /type:"video".*?date:"(\d{4}-\d{2}-\d{2})"/.exec(lines[i]);
    if (m && m[1] <= iso) {
      at = i;
      break;
    }
  }
  lines.splice(at, 0, line);
  return lines.join(eol);
}

function addToTable(file, header, line, iso) {
  const src = read(file);
  const eol = eolOf(src);
  const { start, end, body } = arrayBlock(src, header);
  write(file, src.slice(0, start) + insertByDate(body, line, iso, eol) + src.slice(end));
}

/** Toutes les vidéos du site, dans l'ordre du tableau CONTENT (antichrono). */
function siteVideos() {
  const { body } = arrayBlock(read("enseignements.html"), "const CONTENT = [");
  const re =
    /\{\s*type:"video",\s*title:"([^"]*)",\s*theme:"([^"]*)",\s*date:"([^"]*)",\s*dur:"([^"]*)",\s*yt:"([^"]*)"\s*\}/g;
  return [...body.matchAll(re)].map((m) => ({
    title: m[1], cat: m[2], iso: m[3], dur: m[4], id: m[5],
  }));
}

function knownVideoIds() {
  const files = ["enseignements.html", "archives.html", ...HOME_PAGES];
  const ids = new Set();
  for (const f of files) {
    const src = read(f);
    for (const m of src.matchAll(/(?:yt:"|id: ?"|data-share-video-id="|embed\/)([A-Za-z0-9_-]{11})/g))
      ids.add(m[1]);
  }
  return ids;
}

const PLAY_SVG =
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15c0 .8.88 1.27 1.54.83l11.5-7.5a1 1 0 0 0 0-1.66L8.54 3.67A1 1 0 0 0 7 4.5z"/></svg>';

const featuredCard = (v) => `      <article class="card card-hover media-card reveal" data-share-title="${v.title} · EIPV" data-share-url="https://eipv.org/enseignements" data-share-video-id="${v.id}">
        <button class="media-thumb" data-video="https://www.youtube.com/embed/${v.id}" data-video-title="${v.title}" data-video-cat="${v.cat} · Apôtre François Abama" aria-label="Lire la vidéo">
          <img src="https://img.youtube.com/vi/${v.id}/maxresdefault.jpg" alt="${v.title}" onerror="this.onerror=null;this.src='https://img.youtube.com/vi/${v.id}/hqdefault.jpg'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" />
          <div class="thumb-badges" data-new-date="${v.iso}"><span class="badge badge-video">${PLAY_SVG}Vidéo</span></div>
          <span class="play-btn">${PLAY_SVG}</span>
        </button>
        <div class="media-body">
          <span class="media-cat">${v.cat}</span>
          <h3 class="media-title">${v.title}</h3>
          <p class="media-desc">${v.desc}</p>
          <div class="media-foot">
            <span class="meta-row">${dateFr(v.iso)}</span>
            <span class="share-group">
              <button class="share-btn wa" data-sh="wa" aria-label="Partager sur WhatsApp"></button>
              <button class="share-btn fb" data-sh="fb" aria-label="Partager sur Facebook"></button>
              <button class="share-btn cp" data-sh="cp" aria-label="Copier le lien"></button>
            </span>
          </div>
        </div>
      </article>`;

const gridEntry = (v) =>
  `    { title: "${v.title}", date: "${dateFr(v.iso)}", iso: "${v.iso}", dur: "${v.dur}", cat: "${v.cat}", id: "${v.id}" }`;

/** Récupère les chapôs déjà écrits à la main, pour ne pas les perdre. */
function existingBlurbs() {
  const map = new Map();
  const src = read("index.html");
  for (const chunk of src.split("<article ")) {
    const id = /data-share-video-id="([A-Za-z0-9_-]{11})"/.exec(chunk);
    const desc = /<p class="media-desc">([^<]*)<\/p>/.exec(chunk);
    if (id && desc) map.set(id[1], desc[1]);
  }
  return map;
}

function rebuildHomepages(videos, blurbs) {
  const featured = videos.slice(0, FEATURED_COUNT).map((v) => ({
    ...v,
    desc: blurbs.get(v.id) || BLURBS[v.cat]?.[0] || BLURBS.Parole[0],
  }));
  const grid = videos.slice(FEATURED_COUNT, FEATURED_COUNT + GRID_COUNT);

  for (const f of HOME_PAGES) {
    let src = read(f);
    const eol = eolOf(src);

    const cardsRe =
      /( *<article class="card card-hover media-card reveal" data-share-title="[\s\S]*?<\/article>\r?\n)( *<\/div>\r?\n *<\/div>\r?\n<\/section>)/;
    if (!cardsRe.test(src)) fail(`bloc des cartes vedettes introuvable dans ${f}`);
    // Les gabarits sont écrits en \n : on convertit UNE SEULE fois, sinon on
    // fabrique des \r\r\n qui font réécrire tout le fichier au prochain diff.
    const cards = featured.map(featuredCard).join("\n\n").replace(/\n/g, eol);
    src = src.replace(cardsRe, cards + eol + "$2");

    const gridRe = /  var VIDEOS = \[[\s\S]*?\r?\n  \];/;
    if (!gridRe.test(src)) fail(`tableau VIDEOS introuvable dans ${f}`);
    src = src.replace(
      gridRe,
      ("  var VIDEOS = [\n" + grid.map(gridEntry).join(",\n") + "\n  ];").replace(/\n/g, eol)
    );

    write(f, src);
  }
  return { featured, grid };
}

/** Ajoute les clés manquantes dans en/translations.js, juste après « Nouveau ». */
function addTranslations(pairs) {
  const file = "en/translations.js";
  let src = read(file);
  const eol = eolOf(src);
  const anchor = '      "Nouveau": "New",';
  if (!src.includes(anchor)) fail(`ancre des traductions introuvable dans ${file}`);

  const lines = [];
  for (const [fr, en] of pairs) {
    if (!fr || !en) continue;
    if (src.includes(`"${fr}":`)) continue; // déjà traduit
    if (lines.some((l) => l.startsWith(`      "${fr}":`))) continue;
    lines.push(`      "${fr}": "${en.replace(/"/g, '\\"')}",`);
  }
  if (!lines.length) return 0;

  src = src.replace(anchor, anchor + eol + lines.join(eol));
  write(file, src);
  return lines.length;
}

function bumpCacheVersion() {
  const file = "service-worker.js";
  const src = read(file);
  const m = /const CACHE_VERSION = "eipv-pwa-v(\d+)";/.exec(src);
  if (!m) fail("CACHE_VERSION introuvable dans service-worker.js");
  const next = Number(m[1]) + 1;
  write(file, src.replace(m[0], `const CACHE_VERSION = "eipv-pwa-v${next}";`));
  return next;
}

/* ── 5. Programme principal ───────────────────────────────────────────────── */

async function main() {
  if (!KEY) fail("variable d'environnement YOUTUBE_API_KEY absente.");

  const now = new Date();
  const known = knownVideoIds();
  const onSite = siteVideos().map((v) => fingerprint(v.title, v.iso));
  const channel = await fetchChannel();
  console.log(`Chaîne lue : ${channel.length} vidéos · ${known.size} déjà sur le site.`);

  const candidates = [];
  const skipped = [];

  for (const video of channel) {
    const verdict = classify(video, known, now);
    if (!verdict.keep) {
      if (verdict.why !== "déjà sur le site")
        skipped.push({ id: video.id, title: video.snippet.title, why: verdict.why });
      continue;
    }
    const title = cleanTitle(video.snippet.title);
    if (!title) {
      skipped.push({ id: video.id, title: video.snippet.title, why: "titre illisible" });
      continue;
    }
    const iso = pickDate(video);
    candidates.push({
      id: video.id,
      raw: video.snippet.title,
      uploaded: video.snippet.publishedAt,
      title,
      cat: pickCategory(video.snippet.title),
      iso,
      dur: formatDuration(durationSeconds(video.contentDetails.duration)),
      print: fingerprint(title, iso),
    });
  }

  // Rediffusions d'un culte déjà publié sur le site.
  const fresh = [];
  for (const c of candidates) {
    if (onSite.some((p) => sameBroadcast(p, c.print)))
      skipped.push({ id: c.id, title: c.raw, why: "rediffusion d'un message déjà en ligne" });
    else fresh.push(c);
  }

  // Rediffusions entre elles : on garde la mise en ligne la plus tardive.
  const added = [];
  for (const c of fresh.sort((a, b) => (a.uploaded < b.uploaded ? 1 : -1))) {
    const twin = added.find((k) => sameBroadcast(k.print, c.print));
    if (twin) skipped.push({ id: c.id, title: c.raw, why: `rediffusion de ${twin.id}` });
    else added.push(c);
  }

  for (const s of skipped) console.log(`· écartée · ${s.id} · ${s.why} · ${s.title}`);

  if (!added.length) {
    console.log("Aucune vidéo nouvelle : le site est à jour.");
    report({ added: [], skipped });
    return;
  }

  added.sort((a, b) => (a.iso < b.iso ? 1 : -1)); // antichronologique
  for (const v of added)
    console.log(`+ ${v.iso} · ${v.dur} · [${v.cat}] ${v.title}  (${v.id})`);

  if (DRY_RUN) {
    console.log("\n--dry-run : aucun fichier modifié.");
    report({ added, skipped, dryRun: true });
    return;
  }

  const blurbs = existingBlurbs();

  for (const v of [...added].reverse()) {
    addToTable(
      "enseignements.html",
      "const CONTENT = [",
      `  { type:"video", title:"${v.title}", theme:"${v.cat}", date:"${v.iso}", dur:"${v.dur}", yt:"${v.id}" },`,
      v.iso
    );
    addToTable(
      "archives.html",
      "const ARCHIVE = [",
      `  { type:"video", title:"${v.title}", cat:"${v.cat}", date:"${v.iso}", dur:"${v.dur}", yt:"${v.id}" },`,
      v.iso
    );
  }

  const { featured, grid } = rebuildHomepages(siteVideos(), blurbs);

  const untranslated = [];
  const alreadyTranslated = read("en/translations.js");
  const pairs = [];
  for (const v of [...featured, ...grid]) {
    const [en, complete] = translateTitle(v.title);
    if (!complete && !alreadyTranslated.includes(`"${v.title}":`)) untranslated.push(v.title);
    pairs.push([v.title, en]);
    pairs.push([v.cat, CATEGORY_EN[v.cat] || v.cat]);
    pairs.push([dateFr(v.iso), dateEn(v.iso)]);
    const blurb = BLURBS[v.cat];
    if (blurb) pairs.push(blurb);

    /*
     * Les cartes portent aussi des attributs composés, traduits par le moteur
     * comme n'importe quel texte : data-share-title et data-video-cat. Oubliés,
     * ils laissaient trois bouts de français sur la version anglaise a chaque
     * nouvelle vidéo. Ils sont construits ici exactement comme dans
     * featuredCard(), sans quoi la clé ne correspondrait a rien.
     */
    const catEn = CATEGORY_EN[v.cat] || v.cat;
    pairs.push([`${v.title} · EIPV`, `${en} · EIPV`]);
    pairs.push([
      `${v.cat} · Apôtre François Abama`,
      `${catEn} · Apostle François Abama`,
    ]);
  }
  const keys = addTranslations(pairs);
  const cache = bumpCacheVersion();

  console.log(`\n${added.length} vidéo(s) publiée(s) · ${keys} clé(s) de traduction · cache v${cache}.`);
  if (untranslated.length)
    console.log(
      "À relire en anglais (titre laissé en français) :\n  - " + untranslated.join("\n  - ")
    );

  report({ added, skipped, untranslated });
}

/** Résumé lisible pour GitHub Actions (commit + page de résumé du job). */
function report({ added, skipped, untranslated = [], dryRun = false }) {
  const out = process.env.GITHUB_OUTPUT;
  const summary = process.env.GITHUB_STEP_SUMMARY;

  const subject = added.length
    ? added.length === 1
      ? `Nouvelle video : ${added[0].title} (${added[0].iso})`
      : `${added.length} nouvelles videos YouTube publiees`
    : "Aucune nouvelle video";

  // `added` est un nombre : c'est la seule valeur qui traverse le shell du
  // workflow. Le message de commit, lui, contient des titres YouTube : il passe
  // par un fichier, jamais par une variable interpolée dans une commande.
  if (out) appendFileSync(out, `added=${added.length}\n`);
  if (added.length) {
    const tmp = process.env.RUNNER_TEMP || tmpdir();
    writeFileSync(
      resolve(tmp, "sync-commit-message.txt"),
      `${subject}\n\n${bodyText(added, skipped, untranslated)}\n`
    );
  }
  if (summary) {
    appendFileSync(
      summary,
      `## Synchronisation YouTube${dryRun ? " (simulation)" : ""}\n\n` +
        (added.length
          ? "| Date | Durée | Rubrique | Titre | ID |\n|---|---|---|---|---|\n" +
            added.map((v) => `| ${v.iso} | ${v.dur} | ${v.cat} | ${v.title} | \`${v.id}\` |`).join("\n")
          : "Aucune nouvelle vidéo · le site est à jour.") +
        "\n\n" +
        (skipped.length
          ? "**Écartées :**\n" + skipped.map((s) => `- \`${s.id}\` · ${s.why} · ${s.title}`).join("\n") + "\n"
          : "") +
        (untranslated.length
          ? "\n**Titres à relire en anglais :** " + untranslated.join(" · ") + "\n"
          : "")
    );
  }
}

function bodyText(added, skipped, untranslated) {
  const lines = added.map((v) => `- ${v.title} · ${v.iso} · ${v.dur} · ${v.cat} · ${v.id}`);
  if (skipped.length) {
    lines.push("", "Ecartees :");
    for (const s of skipped) lines.push(`- ${s.id} : ${s.why}`);
  }
  if (untranslated.length) {
    lines.push("", "Titres a relire en anglais :");
    for (const t of untranslated) lines.push(`- ${t}`);
  }
  return lines.join("\n").replace(/EOF/g, "eof");
}

main().catch((e) => fail(e.message));
