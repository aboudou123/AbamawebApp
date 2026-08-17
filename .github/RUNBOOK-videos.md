# Runbook · publier les nouvelles vidéos YouTube sur le site

Procédure suivie tous les 5 jours par une tâche automatisée (routine Claude Code).
Elle est aussi valable pour une mise à jour manuelle.

Site 100 % statique : HTML + CSS + JS, aucun build, aucune dépendance.
Chaîne : **Apôtre Kossi François ABAMA** · `@kossifrancoisabama9052`
Channel ID : `UCx8fhVM8QYd3gwl9tJMwZnQ`

---

## 1. Lister les vidéos de la chaîne

```bash
curl -s "https://www.youtube.com/feeds/videos.xml?channel_id=UCx8fhVM8QYd3gwl9tJMwZnQ"
```

Le flux RSS donne les 15 dernières vidéos (`yt:videoId`, `title`, `published`).

> N'utilise pas WebFetch sur youtube.com : un mur de consentement renvoie une 302
> vers `consent.youtube.com`. Seul `curl` avec le cookie ci-dessous fonctionne.

> **IMPORTANT — méthode sans clé API.** Depuis un serveur cloud, YouTube bloque les
> pages `/watch` et l'API player interne (captcha / LOGIN_REQUIRED sur l'IP sortante).
> On ne peut donc PAS lire `lengthSeconds` ni `status`. On s'appuie uniquement sur
> deux portes **non bloquées** : le **flux RSS** (liste + date) et l'**oEmbed** (titre
> + confirmation que la vidéo est regardable).

Pour chaque vidéo candidate, vérifier qu'elle est **regardable** via **oEmbed** :

```bash
curl -s "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<ID>&format=json"
```

- Réponse **JSON valide (HTTP 200)** → la vidéo existe et est intégrable : publiable.
  Le titre brut s'y trouve dans le champ `title`.
- **HTTP 401 / 403 / 404** → non intégrable (privée, supprimée, ou direct programmé
  pas encore diffusé) : **ne pas publier**, reprendre au prochain cycle.

**Durée : toujours laisser vide (`dur:""`).** Elle n'est pas récupérable sans la page
`/watch` bloquée ; le site l'accepte (le badge de durée ne s'affiche simplement pas).
**Ne jamais inventer de durée.**

## 2. Écarter ce qui ne doit pas être publié

**Directs pas encore diffusés.** Sans accès à `status`, deux garde-fous suffisent :
1. l'**oEmbed doit renvoyer 200** — un direct programmé non commencé renvoie en général
   une erreur ;
2. **ne traiter que les vidéos publiées depuis plus de 6 heures** (champ `published` du
   RSS) : un culte encore en direct est forcément très récent. Une vidéo de moins de
   6 h est reprise au cycle suivant.

> Pour cette raison, faire tourner la routine **le dimanche en soirée (ou plus tard)**,
> quand les cultes du jour sont terminés et déjà mis en ligne.

**Doublons de rediffusion.** Le pasteur republie souvent le même culte 2 ou 3 fois
quand le direct a été coupé puis relancé : même titre, même date, IDs différents.
N'en garder qu'une seule, celle dont la date RSS `published` est la **plus tardive**
(c'est en général l'enregistrement complet).

**Extraits courts.** Sans la durée, on ne filtre plus par durée. Écarter un extrait
seulement si son **titre nettoyé est identique** à un message complet déjà présent, ou
s'il contient un mot de teaser (`extrait`, `short`, `teaser`, `bande-annonce`). Dans le
doute, publier : une vidéo en trop est moins grave qu'un message manquant.

**Déjà en ligne.** Ignorer tout ID déjà présent dans le dépôt :
`grep -r "<ID>" --include=*.html .`

## 3. Nettoyer le titre

Les titres YouTube sont bruts, par exemple :
`LA PUISSANCE DE L'EXCEPTION ET DE LA PROTECTION II Avec Apôtre ABAMA Kossi François II 14/06/2026`

Retirer le suffixe `II Avec Apôtre ABAMA Kossi François II <date>` et toutes ses
variantes (`ll`, `II Apôtre...`, la date finale). Passer en casse de phrase française :
`La puissance de l'exception et de la protection`. La date s'affiche déjà à part sur
la carte, elle n'a pas à figurer dans le titre.

Pour les séries, utiliser le séparateur `·` :
`Shammah Kabowd Power · Édition Août 2026 · Jour 3`

**Ne jamais employer de tiret long** (`—` ou `–`) : ils ont été retirés de tout le site.
Utiliser `·` ou `:`.

Choisir une catégorie courte et réutiliser celles qui existent déjà quand c'est possible :
Gloire, Famille, Louange, Victoire, Vérité, Protection, Esprit Saint, Alliance,
Restauration, Succès, Puissance, Foi, Prospérité, Délivrance, Annonce.

## 4. Où ajouter la vidéo · 3 tableaux dans 5 fichiers

Il n'existe aucune source de données partagée : chaque page a son tableau, avec des
noms de clés différents. Une vidéo doit être ajoutée aux trois.

| Fichier | Tableau | Clés | Tri |
|---|---|---|---|
| `enseignements.html` | `CONTENT` | `type, title, theme, date, dur, yt` | **non trié** : insérer à la bonne place, ordre antichronologique, vidéos puis audios |
| `archives.html` | `ARCHIVE` | `type, title, cat, date, dur, yt` | retrié par date à l'affichage, l'ordre du tableau est libre |
| `index.html` + `fr/index.html` + `en/index.html` | 3 cartes en dur + `VIDEOS` | cartes HTML ; `title, date, iso, dur, cat, id` | les 3 fichiers sont **identiques**, appliquer exactement la même modification |

`date` est au format ISO `YYYY-MM-DD`. Sur l'accueil, le tableau `VIDEOS` utilise en plus
`date` sous forme de texte français affiché (`"7 août 2026"`) et `iso` pour la pastille.

Sur l'accueil, garder les 3 vidéos les plus récentes **et regardables** en cartes
vedettes, et les 4 suivantes dans `VIDEOS`. Les cartes en dur portent la date via
`<div class="thumb-badges" data-new-date="YYYY-MM-DD">`.

## 5. Traductions anglaises · obligatoire

Chaque titre, catégorie, description et date affichée est une **clé de traduction**.
Sans entrée dans `en/translations.js`, le texte reste en français sur la version anglaise.

Ajouter dans `en/translations.js` (objet `en.strings`) le titre, la catégorie si elle est
nouvelle, la description des cartes d'accueil et les dates françaises affichées
(`"7 août 2026": "August 7, 2026"`). Retirer les clés devenues inutilisées.

Vérifier que le fichier reste valide :
```bash
node -e "global.window={};require('./fr/translations.js');require('./en/translations.js');console.log('ok')"
```

## 6. Mention « Nouveau » · ne rien faire

Elle est **automatique**. `EIPV_IS_NEW` / `EIPV_NEW_BADGE` dans `js/app.js` l'affichent
pendant 4 semaines à partir du champ `date` (ou `iso`), puis elle disparaît seule ; la
vidéo, elle, reste en place. Ne jamais poser de marqueur à la main.

## 7. Cache PWA · à ne pas oublier

Incrémenter `CACHE_VERSION` dans `service-worker.js` (`eipv-pwa-vN` → `vN+1`)
**à chaque fois que `en/translations.js`, `js/app.js` ou `css/styles.css` change**.
Ces fichiers sont servis en *cache-first* : sans ce changement, les visiteurs réguliers
gardent l'ancienne version. Les pages HTML, elles, sont en *network-first*.

## 8. Vérifier avant de proposer

```bash
node --check js/app.js && node --check service-worker.js
python -m http.server 8777 &
```

Puis contrôler que les pages se rendent et que les compteurs sont cohérents :

```bash
curl -s http://localhost:8777/enseignements.html | grep -c "<ID>"
```

Si un navigateur headless est disponible, rendre la page et compter les cartes :

```bash
chrome --headless --disable-gpu --virtual-time-budget=8000 \
       --dump-dom "http://localhost:8777/enseignements.html"
```

Contrôles attendus : aucun ID en double, dates au format ISO valide, ordre
antichronologique respecté dans `CONTENT`, et le nombre de vidéos annoncé par le
compteur de la page correspond au tableau.

## 9. Archiver les événements passés (page Annonces)

À chaque cycle, en plus des vidéos, tenir la page `annonces.html` à jour.

- Chaque événement y est une carte `<article class="evt-item">` avec une pastille
  `data-countdown="<date ISO>"` qui passe **seule** à « Terminé » une fois la date
  dépassée (script en bas de `annonces.html`).
- **Quand un événement est passé** (sa date `data-countdown` est antérieure à
  aujourd'hui) et qu'il n'est **pas déjà** dans `archives.html`, l'ajouter au tableau
  `ARCHIVE` :
  ```js
  { type:"text", title:"<titre de l'événement>", cat:"Annonce", date:"<date ISO>",
    link:"/images/annonces/<affiche>.jpg" },
  ```
  Le `link` pointe vers l'affiche : en archives, il produit un bouton « Voir l'affiche ».
  L'ordre dans `ARCHIVE` est libre (la page retrie par date). Vérifier l'absence de
  doublon : `grep -n "<titre>" archives.html`.
- Traduire le titre dans `en/translations.js` (les clés « Annonce » et « Voir l'affiche »
  existent déjà) puis **bumper `CACHE_VERSION`** (translations = cache-first).
- Laisser la carte sur `annonces.html` (déjà marquée « Terminé »). Ne la retirer de la
  section « À l'affiche » que si le pasteur le demande, ou pour laisser la place à de
  nouveaux événements à venir.

## 10. Livrer

Créer une branche, commiter, ouvrir une **Pull Request** vers `main`.
**Ne jamais pousser directement sur `main`** : tout push sur `main` déclenche le
déploiement SFTP vers abamafrancois.org (`.github/workflows/deploy.yml`), donc le site
public changerait sans relecture.

La PR doit lister, pour chaque vidéo ajoutée : titre retenu, ID, date, durée, catégorie ;
et signaler ce qui a été volontairement écarté (direct pas encore diffusé, doublon,
extrait) avec la raison.

**S'il n'y a aucune vidéo nouvelle, ne rien commiter et ne pas ouvrir de PR.**
Dire simplement que le site est à jour.
