# Alvea dental — landing et étude de marché

Site statique (HTML, CSS, JavaScript sans outil de build), publié sur GitHub Pages à l'adresse **https://alveadental.eu**.

- `alveadental.eu` : la **landing**. Elle présente l'idée avec une animation « assistant » et renvoie vers l'étude.
- `alveadental.eu/etude/` : le **questionnaire**. Un parcours d'environ 5 minutes : accueil, questions sur sa pratique, démo en 8 chapitres, avis, puis prise de rendez-vous. Les réponses partent en `POST` JSON vers un webhook Make, qui les range dans Airtable (table `Réponses v2`).

## Fichiers

```
index.html            la landing (racine du site)
landing.css           styles propres à la landing (le reste vient de etude/css/style.css)
landing.js            textes FR/EN de la landing, liens vers l'étude, animation « assistant »
og.png                image de partage de la landing (1200×630)
CNAME                 domaine personnalisé alveadental.eu (GitHub Pages)
docs/                 colonnes Airtable, formule de score, payload de test pour Make

etude/index.html            le questionnaire (les écrans s'enchaînent)
etude/confidentialite.html  la politique de confidentialité, FR + EN
etude/css/style.css         styles communs (thème clair / sombre automatique)
etude/js/config.js          réglages : webhook, adresse, contact, photo, LinkedIn, Cal.com
etude/js/i18n.js            textes FR + EN du questionnaire, valeurs des choix, avis
etude/js/app.js             écrans, navigation, état, validation, envoi
etude/js/reviews.js         cartes d'avis à toucher (écran 3)
etude/js/demo.js            démo en 8 chapitres (écran 8)
etude/js/demo3d.js          bouche 3D (Three.js r128 chargé à la demande) et devis fictif
etude/assets/               logo, favicons, image de partage du questionnaire og-image.png
```

La landing réutilise les fichiers du questionnaire : les couleurs, polices et boutons (`etude/css/style.css`), les réglages (`etude/js/config.js`), les textes de la démo (`etude/js/i18n.js`) et la bouche 3D (`etude/js/demo3d.js`).

## Réglages (`etude/js/config.js`)

Un seul fichier, lu par la landing et par le questionnaire.

- `WEBHOOK_URL` : URL du webhook Make (`https://hook.eu2.make.com/…`).
- `SITE_URL` : adresse du questionnaire (`https://alveadental.eu/etude/`). Elle sert au lien de partage `?ref=`.
- `CONTACT_EMAIL`, `CONTACT_NAME` : affichés à l'accueil du questionnaire, sur l'écran de fin et dans le pied de page de la landing.
- `PHOTO_URL` : photo ronde de l'accueil du questionnaire. Déposez-la par exemple dans `etude/assets/omar.jpg`, puis mettez `"assets/omar.jpg"` (le chemin part du dossier `etude/`). Vide = cercle avec l'initiale.
- `LINKEDIN_URL` : profil LinkedIn. Une fois rempli, une petite icône s'affiche à côté de la présentation d'Omar dans le questionnaire et dans le pied de page de la landing. Vide = rien n'est affiché.
- `CAL_LINK` : lien Cal.com de l'appel de 20 min. Le calendrier s'affiche sur l'écran Merci quand le répondant a choisi « Oui, avec plaisir ». Le nom, l'e-mail et le téléphone sont pré-remplis. `CAL_PHONE_PARAM` donne le nom du champ téléphone côté Cal.com. Le numéro est converti au format international (`0470 12 34 56` en Belgique devient `+32470123456`).

Tant que `WEBHOOK_URL` ne commence pas par `https://` (ou `http://localhost`, pratique pour tester avec un faux webhook local), le bouton « Envoyer » affiche « L'envoi n'est pas encore configuré » et le JSON est écrit dans la console du navigateur.

Si l'adresse du site change, mettez aussi à jour le fichier `CNAME` et les balises `og:url` et `og:image` des deux `index.html`.

## Changer un texte

- **Landing** : objet `L` en haut de `landing.js` (FR et EN). Le texte de `index.html` sert seulement de version de secours sans JavaScript. Les textes de l'animation (dictée, visites, SMS, devis) viennent de la démo, dans `etude/js/i18n.js` (`TEXTS.*.demo`).
- **Questionnaire** : `etude/js/i18n.js`.
  - `TEXTS.fr` et `TEXTS.en` : titres, questions (`q`), boutons, messages.
  - `REVIEW_PAIRS` : les avis de l'écran 3, un négatif et un positif par thème. **Seulement des avis réels**, coupés mais pas reformulés. Un avis dont `pos.fr` est vide n'est pas affiché.
  - `OPTIONS` : les choix proposés. **Ces valeurs sont envoyées telles quelles à Airtable.** Si vous en changez une, changez-la aussi dans le champ Airtable correspondant (accents et espaces compris). La traduction anglaise affichée se trouve dans `TEXTS.en.opt`.
- **Confidentialité** : directement dans `etude/confidentialite.html`.

## Ce qui est envoyé

Un seul `POST` (`Content-Type: application/json`) à la fin. La liste des clés, leur type et la colonne Airtable correspondante sont dans `docs/airtable-champs.md`, et un exemple complet dans `docs/test-payload.json`. Les valeurs des choix sont toujours en français, même si le répondant a lu le site en anglais (`langue` vaut alors `EN`). Un champ non rempli part vide : `""`, `[]`, `false`, ou `null` pour les nombres.

Protections :

- **Champ caché `website` (honeypot)** : s'il est rempli, on affiche le remerciement sans rien envoyer. Il part aussi dans le payload (vide), pour le filtre du scénario Make.
- **Durée minimale** : l'envoi est refusé si le parcours a duré moins de 60 secondes (message « rempli trop vite »).
- **Échec réseau** : message clair et bouton « Réessayer ». Les réponses restent dans le navigateur (`localStorage`) jusqu'à un envoi réussi, puis sont effacées.

## Partage entre dentistes

Chaque navigateur reçoit un `code_partage` de 6 caractères, gardé dans `localStorage`. L'écran de fin propose le lien `https://alveadental.eu/etude/?ref=<code>`. Quand quelqu'un arrive avec `?ref=xxx`, la valeur est gardée et envoyée dans `envoye_par`.

**Anciens liens** : GitHub redirige `elfakirio.github.io/alvea-etude/?ref=…` vers `alveadental.eu/?ref=…`, c'est-à-dire la landing. Quand l'adresse contient `?ref=`, la landing renvoie tout de suite vers `/etude/` en gardant tous les paramètres (`ref`, `lang`).

## La landing

- **Boutons « Participer à l'étude »** : ils mènent à `etude/`. Ils transmettent `ref` et `lang` s'ils sont dans l'adresse, et `lang` si le visiteur a changé de langue sur la page.
- **Langue** : `?lang=en`, sinon la langue mémorisée (la même que celle du questionnaire), sinon celle du navigateur.
- **Animation** :
  - elle ne démarre (et Three.js ne se charge) que quand la fenêtre est visible à l'écran ;
  - elle se met en pause hors écran ou quand l'onglet est masqué ;
  - sans WebGL, les cartes s'affichent sans la bouche 3D ;
  - avec « réduire les animations », l'état final s'affiche directement, sans mouvement.
- **Régénérer `og.png`** après un changement du hero : serveur local lancé, puis :

  ```bash
  ~/Library/Caches/ms-playwright/chromium_headless_shell-1194/chrome-mac/headless_shell --hide-scrollbars --window-size=1200,630 --virtual-time-budget=5000 --screenshot="$PWD/og.png" "http://localhost:8000/?lang=fr&og"
  ```

  Le paramètre `?og` fige la fenêtre de démo sur son écran d'accueil et resserre un peu le hero pour qu'il tienne en 1200×630.

## Tester en local

Les fichiers JavaScript sont des modules : il faut un petit serveur (ouvrir `index.html` en double-clic ne marche pas).

```bash
python3 -m http.server 8000
```

Ensuite :

- la landing : http://localhost:8000 ;
- le questionnaire : http://localhost:8000/etude/.

Astuces :

- `?lang=en` force l'anglais ;
- `?ref=abc123` simule un lien de parrainage (sur la landing, il redirige vers l'étude) ;
- le bouton « Recommencer », en haut du questionnaire, efface les réponses en cours.

## Déployer / redéployer

Le site est servi par GitHub Pages depuis la branche `main`, dossier racine. Pour publier une modification :

```bash
git add -A
git commit -m "Texte de l'écran 4 modifié"
git push
```

GitHub Pages republie tout seul en une à deux minutes (onglet **Actions** du dépôt pour suivre). Le domaine `alveadental.eu` est réglé dans **Settings → Pages** (Custom domain, Enforce HTTPS) et par le fichier `CNAME`.
