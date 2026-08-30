# Runbook · publier les nouvelles vidéos YouTube sur le site

Site 100 % statique : HTML + CSS + JS, aucun build, aucune dépendance.
Chaîne : **Apôtre Kossi François ABAMA** · `@kossifrancoisabama9052`
Channel ID : `UCx8fhVM8QYd3gwl9tJMwZnQ`

---

## 0. C'EST AUTOMATIQUE · lire ceci en premier

Depuis le 30 août 2026, la publication ne dépend plus de personne.

`.github/workflows/sync-youtube.yml` tourne **chaque dimanche à 20 h 00 UTC**
(plus un rattrapage le mercredi si le dimanche a échoué). Il lance
`.github/scripts/sync-youtube.mjs`, qui :

1. lit la chaîne via l'API YouTube Data v3 (secret GitHub `YOUTUBE_API_KEY`) ;
2. écarte les directs en cours, les rediffusions en doublon et les extraits ;
3. remplit les 3 tableaux des 5 fichiers, les traductions et le cache PWA ;
4. **commite sur `main` et déploie lui-même vers abamafrancois.org.**

C'est le pasteur qui a choisi la publication directe le 30 août 2026 : le site
doit être à jour le dimanche soir sans qu'il ait quoi que ce soit à valider.

**Pour le lancer à la main** : onglet *Actions* du dépôt → *Vidéos YouTube →
site* → *Run workflow*. Cocher *dry_run* pour voir la liste sans rien publier.

**En local** :

```bash
YOUTUBE_API_KEY=... node .github/scripts/sync-youtube.mjs --dry-run   # simulation
YOUTUBE_API_KEY=... node .github/scripts/sync-youtube.mjs             # écrit les fichiers
```

**Si le job échoue** (clé expirée, quota dépassé, API en panne), GitHub prévient
par e-mail et **rien n'est publié** : le script préfère ne rien écrire plutôt
que d'abîmer une page. Les sections suivantes décrivent la même procédure à la
main, pour ce cas-là et pour comprendre ce que fait le script.

**Ce que le script ne sait pas faire** : trouver un beau titre éditorial, et
traduire un titre inédit en anglais. Il produit un titre correct tiré de la
vidéo, signale dans le résumé du job les titres restés en français, et n'invente
jamais une date ou une durée. Corriger après coup dans les 5 fichiers est sans
risque : le script ne repasse jamais sur une vidéo déjà publiée.

---

## 1. Lister les vidéos de la chaîne

**Méthode officielle · API YouTube Data v3** (clé fournie par le pasteur le
30 août 2026, stockée dans le secret GitHub `YOUTUBE_API_KEY` — **jamais dans le
dépôt**). La playlist des mises en ligne est `UU` + le channel ID sans son `UC` :

```bash
curl -s "https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=25&playlistId=UUx8fhVM8QYd3gwl9tJMwZnQ&key=$YOUTUBE_API_KEY"
curl -s "https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=<ID1>,<ID2>&key=$YOUTUBE_API_KEY"
```

Le second appel donne tout ce qu'il faut, sans aucun contournement :
`snippet.title`, `snippet.publishedAt`, `snippet.liveBroadcastContent`,
`contentDetails.duration` (ISO 8601) et `status.uploadStatus`.

> Sans clé, il reste le flux RSS
> `https://www.youtube.com/feeds/videos.xml?channel_id=UCx8fhVM8QYd3gwl9tJMwZnQ`
> (15 dernières vidéos, titre + date) et l'oEmbed
> `https://www.youtube.com/oembed?url=...&format=json` (titre, HTTP 200 = regardable).
> Mais **ni durée ni statut de direct** : depuis une IP de serveur, YouTube bloque
> les pages `/watch`. C'est le mode dégradé, pas le mode normal.

**Ne jamais inventer une métadonnée.** Si l'API ne donne pas une valeur, laisser
le champ vide (`dur:""`) : le site l'accepte, le badge ne s'affiche simplement pas.

## 2. Écarter ce qui ne doit pas être publié

**Directs pas encore diffusés.** `snippet.liveBroadcastContent` doit valoir `none`
(sinon c'est `upcoming` ou `live`) et `status.uploadStatus` doit valoir `processed`.
Garde-fou supplémentaire : **ignorer les vidéos publiées depuis moins de 3 heures**,
elles sont reprises au passage suivant. C'est la raison pour laquelle la routine
tourne **le dimanche en soirée**, cultes terminés et mis en ligne.

**Doublons de rediffusion · le piège n°1 de cette chaîne.** Le pasteur republie
souvent le même culte 2 ou 3 fois quand le direct a été coupé puis relancé : même
message, même jour, IDs différents, titres légèrement différents. Comparer
**la date affichée + les chiffres du titre + le recouvrement des mots** (c'est ce
que fait `sameBroadcast()` dans le script) : les chiffres distinguent « Jour 1 » de
« Jour 1 · Partie 2 », le recouvrement rattrape les variantes d'écriture. Sur une
correspondance, **ne garder que la vidéo mise en ligne en dernier**, en général
l'enregistrement complet.

Exemples réels écartés à juste titre : `KT1TkoDC1nA` (rediffusion de `mQdqagLlpLE`),
`WvFjDEYeoRc` (rediffusion de `5FrO7rDros8`), `04X3bI7F8OM` (rediffusion de
`hq3Dh-jc6Cs`).

**Extraits courts.** Écarter en dessous de **3 minutes**, ou si le titre contient
un mot de teaser (`extrait`, `short`, `teaser`, `bande-annonce`). Dans le doute,
publier : une vidéo en trop est moins grave qu'un message manquant.

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

> **Le piège à connaître.** `js/i18n.js` traduit en cherchant le texte français
> **exact** comme clé dans `en/translations.js`. Clé absente = français laissé en
> place, **sans aucun message d'erreur**. Il suffit donc de retoucher une phrase
> française pour que sa traduction cesse de s'appliquer : la page anglaise devient
> un mélange des deux langues, et personne ne le voit.
>
> C'est arrivé pour de vrai : le site a été relu de « Pasteur … Abama » vers
> « Apôtre … ABAMA » sans toucher aux clés. 80 phrases sont retombées en français.
>
> **Avant toute livraison, lancer :**
>
> ```bash
> node .github/scripts/check-translations.mjs           # rapport
> node .github/scripts/check-translations.mjs --strict  # sort en erreur
> node .github/scripts/check-translations.mjs --emit    # clés prêtes à coller
> ```
>
> Le script rejoue la logique du moteur : il liste les chaînes sans traduction,
> les clés devenues orphelines (souvent l'ancienne version d'une phrase
> retouchée : c'est la trace du décrochage) et les clés en double.
>
> **Toujours utiliser `--emit` pour créer une clé.** Certaines phrases
> contiennent une espace insécable (`Thème&nbsp;:`) invisible à l'œil : retapée
> à la main, la clé est fausse et ne s'appliquera jamais. `--emit` produit la
> clé échappée (`"Thème : …"`), il ne reste qu'à écrire l'anglais.
>
> La routine du dimanche lance ce contrôle et écrit le résultat dans le résumé
> du job, avec un avertissement si du français n'est pas traduit.

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

**Les vidéos vont directement sur `main`** (choix du pasteur, 30 août 2026) : un
push sur `main` déclenche le déploiement SFTP vers abamafrancois.org. C'est
voulu — le site doit être à jour le dimanche soir sans validation humaine.

Le commit liste, pour chaque vidéo ajoutée : titre retenu, date, durée, catégorie
et ID, puis ce qui a été écarté et pourquoi.

Attention : un push fait par le `GITHUB_TOKEN` d'un workflow **ne déclenche pas**
`deploy.yml` (garde-fou anti-boucle de GitHub). C'est pourquoi
`sync-youtube.yml` appelle lui-même `.github/scripts/deploy-sftp.sh` après le
push. Ne pas retirer cette étape en croyant qu'elle fait doublon.

**S'il n'y a aucune vidéo nouvelle, ne rien commiter.** Dire simplement que le
site est à jour.

> Cette règle ne vaut que pour les vidéos. Pour une refonte, un changement de
> style ou de structure, on passe toujours par une **Pull Request**.
