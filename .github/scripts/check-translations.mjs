#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Contrôle des traductions anglaises
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Le moteur `js/i18n.js` traduit en cherchant le texte français EXACT dans le
 *  dictionnaire `en/translations.js`. S'il ne trouve pas la clé, il laisse le
 *  français en place **sans rien signaler**. Résultat : il suffit de retoucher
 *  une phrase française pour que sa traduction cesse silencieusement de
 *  s'appliquer, et la page anglaise devient un mélange des deux langues.
 *
 *  Ce script rejoue la logique du moteur hors du navigateur : il extrait tout
 *  ce qui sera traduit à l'exécution, et liste ce qui n'a pas de clé.
 *
 *  Usage :
 *      node .github/scripts/check-translations.mjs           # rapport
 *      node .github/scripts/check-translations.mjs --strict  # sort en erreur
 *
 *  Sortie : les chaînes sans traduction, et les clés du dictionnaire qui ne
 *  correspondent plus à rien (souvent l'ancienne version d'une phrase
 *  retouchée : c'est la trace du décrochage).
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STRICT = process.argv.includes("--strict");

const PAGES = [
  "index.html",
  "fr/index.html",
  "en/index.html",
  "enseignements.html",
  "archives.html",
  "annonces.html",
  "contact.html",
];

/** Attributs traduits par translateAttrs() dans js/i18n.js. */
const ATTRS = [
  "alt",
  "aria-label",
  "data-share-title",
  "data-share-url",
  "data-video-cat",
  "data-video-title",
  "placeholder",
  "title",
];

/** Champs des tableaux de données passés par tr() dans js/app.js. */
const DATA_FIELDS = ["title", "theme", "cat", "date"];

/* ── Entités HTML · le DOM les décode avant que le moteur ne cherche la clé ── */

const NAMED = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  bull: "•", middot: "·", laquo: "«", raquo: "»", hellip: "…",
  ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”",
  times: "×", deg: "°", eacute: "é", egrave: "è", ecirc: "ê", euml: "ë",
  agrave: "à", acirc: "â", ccedil: "ç", ocirc: "ô", ugrave: "ù", ucirc: "û",
  icirc: "î", iuml: "ï", oelig: "œ", aelig: "æ",
};

const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED[name.toLowerCase()] ?? m);

/* ── Extraction ───────────────────────────────────────────────────────────── */

function body(html) {
  const start = html.indexOf("<body");
  const end = html.lastIndexOf("</body>");
  if (start < 0 || end < 0) return html; // le moteur ne parcourt que <body>
  return html.slice(html.indexOf(">", start) + 1, end);
}

/** Conteneurs dont shouldSkip() rejette le contenu textuel. */
function stripSkipped(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ");
}

function textNodes(html) {
  return stripSkipped(body(html))
    .split(/<[^>]*>/)
    .map((chunk) => decode(chunk).trim())
    .filter(Boolean);
}

function attrValues(html) {
  const out = [];
  // Les <script> sont retirés : sinon on récolte des morceaux de gabarits JS
  // (`data-video-title="' + v.title + '"`). Les <svg> sont gardés : leurs
  // aria-label et title sont bien traduits par le moteur.
  const src = body(html)
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ");
  for (const attr of ATTRS) {
    const re = new RegExp(`\\s${attr}="([^"]*)"`, "gi");
    let m;
    while ((m = re.exec(src))) out.push(decode(m[1]).trim());
  }
  return out.filter(Boolean);
}

/** Titres, thèmes et dates des tableaux CONTENT / ARCHIVE / VIDEOS. */
function dataStrings(html) {
  const out = [];
  for (const field of DATA_FIELDS) {
    const re = new RegExp(`\\b${field}:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "g");
    let m;
    while ((m = re.exec(html))) out.push(m[1].replace(/\\"/g, '"').trim());
  }
  return out.filter(Boolean);
}

/* ── Ce qui n'a pas à être traduit ────────────────────────────────────────── */

const NEUTRAL = new Set([
  "EIPV", "FR", "EN", "YouTube", "Facebook", "WhatsApp", "COMECTO", "SKP",
  "Shammah Kabowd Power", "Apôtre ABAMA Kossi François", "Kossi François ABAMA",
  "ABAMA", "Awatamé", "Adidogomé", "Togo", "Lomé", "Amen", "PWA",
]);

function skipString(s) {
  if (s.length < 3) return true;
  if (!/[a-zA-ZÀ-ÿ]/.test(s)) return true;           // chiffres, ponctuation
  if (NEUTRAL.has(s)) return true;
  if (/^https?:\/\//i.test(s)) return true;           // URL
  if (/^[\w.+-]+@[\w.-]+$/.test(s)) return true;      // e-mail
  if (/^[+\d][\d\s/().-]{5,}$/.test(s)) return true;  // téléphone
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return true;     // identifiant YouTube
  if (/^[\d\s:.,/h-]+$/.test(s)) return true;         // horaires, durées
  return false;
}

/** Signal fort : la chaîne est visiblement du français. */
const FRENCH =
  /[éèêëàâçôûùîï]|\b(le|la|les|des|du|de|et|ou|pour|dans|sur|avec|vous|nous|votre|notre|une?|ce|cette|est|sont|qui|que|nos|vos|au|aux|par|plus|tout|tous|sans|chez)\b/i;

/* ── Programme ────────────────────────────────────────────────────────────── */

const dict = (() => {
  const src = readFileSync(resolve(ROOT, "en/translations.js"), "utf8");
  const sandbox = { window: {} };
  new Function("window", src)(sandbox.window);
  const strings = sandbox.window.EIPV_TRANSLATIONS?.en?.strings;
  if (!strings) throw new Error("EIPV_TRANSLATIONS.en.strings introuvable");
  return strings;
})();

const seen = new Map(); // chaîne -> fichiers où elle apparaît
for (const page of PAGES) {
  const html = readFileSync(resolve(ROOT, page), "utf8");
  for (const s of [...textNodes(html), ...attrValues(html), ...dataStrings(html)]) {
    if (skipString(s)) continue;
    if (!seen.has(s)) seen.set(s, new Set());
    seen.get(s).add(page);
  }
}

/*
 * Une partie de l'interface est construite en JavaScript (feuille de partage,
 * lien de parrainage, libellés du lecteur…) : ces textes n'existent dans aucune
 * page HTML. Sans cette vérification ils seraient déclarés orphelins à tort.
 */
const CODE = [
  ...["js/app.js", "js/i18n.js", "js/pwa.js"].map((f) => readFileSync(resolve(ROOT, f), "utf8")),
  // Les <script> en ligne des pages : enseignements.html et archives.html y
  // fabriquent leurs cartes, avec des libellés qui n'existent nulle part ailleurs.
  ...PAGES.map((p) =>
    [...readFileSync(resolve(ROOT, p), "utf8").matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
      .map((m) => m[1])
      .join("\n")
  ),
].join("\n");

const missing = [...seen.keys()].filter((s) => !(s in dict));
const french = missing.filter((s) => FRENCH.test(s));
const other = missing.filter((s) => !FRENCH.test(s));
const orphans = Object.keys(dict).filter((k) => !seen.has(k) && !CODE.includes(k));

/** Distance de Levenshtein bornée, pour rapprocher une chaîne de son ancienne clé. */
function close(a, b) {
  if (Math.abs(a.length - b.length) > 40) return false;
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[n] <= Math.max(6, Math.round(Math.max(m, n) * 0.25));
}

/*
 * Certaines chaînes contiennent des caractères invisibles — surtout l'espace
 * insécable de « Thème&nbsp;: ». Recopiée à la main, la clé serait fausse et la
 * traduction ne s'appliquerait jamais. Le mode --emit produit donc des clés
 * échappées, prêtes à coller dans en/translations.js.
 */
/* Décrit par points de code : aucun caractère invisible dans ce fichier. */
function isInvisible(cp) {
  if ([0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0xa0, 0x1680, 0x3000, 0xfeff].includes(cp)) return true;
  if (cp >= 0x2000 && cp <= 0x200f) return true; // espaces fines, ZWSP, marques
  if (cp >= 0x2028 && cp <= 0x202f) return true; // séparateurs, espace insécable étroite
  if (cp >= 0x2060 && cp <= 0x206f) return true; // jointures invisibles
  if (cp >= 0xfe00 && cp <= 0xfe0f) return true; // sélecteurs de variante des emoji
  return false;
}

function jsKey(s) {
  return JSON.stringify(s).replace(/./gsu, (c) => {
    const cp = c.codePointAt(0);
    return isInvisible(cp)
      ? "\\u" + cp.toString(16).toUpperCase().padStart(4, "0")
      : c;
  });
}

if (process.argv.includes("--emit")) {
  for (const s of missing) console.log(`      ${jsKey(s)}: "",`);
  process.exit(0);
}

/*
 * Doublons : en JavaScript la dernière déclaration l'emporte silencieusement.
 * Deux clés identiques avec deux traductions différentes = une traduction
 * perdue sans le moindre message.
 */
const duplicates = (() => {
  const src = readFileSync(resolve(ROOT, "en/translations.js"), "utf8");
  const count = new Map();
  for (const m of src.matchAll(/^\s*("(?:[^"\\]|\\.)*")\s*:/gm)) {
    count.set(m[1], (count.get(m[1]) || 0) + 1);
  }
  return [...count.entries()].filter(([, n]) => n > 1);
})();

if (duplicates.length) {
  console.log("═══ CLÉS EN DOUBLE DANS en/translations.js ═══");
  for (const [key, n] of duplicates) console.log(`  ${key} · ${n} fois`);
  console.log("");
}

console.log(`Dictionnaire : ${Object.keys(dict).length} clés`);
console.log(`Chaînes traduisibles trouvées dans les pages : ${seen.size}`);
console.log(`Sans traduction : ${missing.length} (dont ${french.length} clairement en français)\n`);

if (french.length) {
  console.log("═══ FRANÇAIS NON TRADUIT ═══");
  for (const s of french) {
    const pages = [...seen.get(s)].join(", ");
    console.log(`\n  « ${s} »`);
    console.log(`    pages : ${pages}`);
    const near = orphans.find((k) => close(s, k));
    if (near) {
      console.log(`    ⚠ le dictionnaire contient une clé très proche, devenue inutile :`);
      console.log(`      « ${near} »`);
      console.log(`      → la phrase française a été retouchée sans mettre la clé à jour.`);
    }
  }
}

if (other.length) {
  console.log("\n═══ SANS TRADUCTION (à vérifier, peut-être neutre) ═══");
  for (const s of other) console.log(`  « ${s} »  [${[...seen.get(s)].join(", ")}]`);
}

if (orphans.length) {
  console.log(`\n═══ CLÉS ORPHELINES · ${orphans.length} ═══`);
  console.log("(plus aucune page ne contient ce texte français)");
  for (const k of orphans) console.log(`  « ${k} »`);
}

if (STRICT && (french.length || duplicates.length)) {
  if (french.length)
    console.error(`\nÉCHEC : ${french.length} chaîne(s) française(s) sans traduction anglaise.`);
  if (duplicates.length)
    console.error(`ÉCHEC : ${duplicates.length} clé(s) en double dans en/translations.js.`);
  process.exit(1);
}
