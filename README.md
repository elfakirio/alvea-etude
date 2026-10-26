# Alvea dental — étude de marché interactive

Site statique (HTML, CSS, JavaScript sans outil de build), publié sur GitHub Pages.
Un dentiste y vit un parcours de 6 à 7 minutes : accroche, questions sur sa pratique, démo 3D, avis. Les réponses partent en `POST` JSON vers un webhook Make, qui les range dans Airtable.

## Fichiers

```
index.html            la page unique (les écrans s'enchaînent)
confidentialite.html  la politique de confidentialité, FR + EN
css/style.css         styles (thème clair / sombre automatique)
js/config.js          URL du webhook Make et URL publique du site
js/i18n.js            tous les textes FR + EN, et les valeurs des choix
js/app.js             navigation, état, validation, envoi
js/reviews.js         animation des avis (écran 2)
js/teaser.js          animation teaser (écran 7)
js/demo3d.js          démo 3D (écran 8), Three.js r128 chargé à la demande
assets/               logo, favicons, image de partage og-image.png (1200×630)
```

## Changer un texte

Tout est dans `js/i18n.js` :

- `TEXTS.fr` et `TEXTS.en` : titres, questions (`q`), boutons, messages ;
- `REVIEWS` : les 6 avis de l'écran 2 (texte FR, traduction EN, étoiles, année) ;
- `OPTIONS` : les choix proposés. **Ces valeurs sont envoyées telles quelles à Airtable** : si vous en changez une, changez-la aussi dans le champ Airtable correspondant (accents et espaces compris). La traduction anglaise affichée se trouve dans `TEXTS.en.opt`.

Les textes de la page de confidentialité sont directement dans `confidentialite.html` (pensez à remplacer `contact@…` par la vraie adresse, à deux endroits).

## Changer l'URL du webhook

Dans `js/config.js` :

```js
export const CONFIG = {
  WEBHOOK_URL: "https://hook.eu2.make.com/xxxxxxxx",
  SITE_URL: "https://elfakirio.github.io/alvea-etude/"
};
```

Tant que `WEBHOOK_URL` ne commence pas par `https://` (ou `http://localhost`, pratique pour tester avec un faux webhook local), le bouton « Envoyer » affiche « L'envoi n'est pas encore configuré » et le JSON est écrit dans la console du navigateur (pratique pour vérifier le format).

`SITE_URL` sert à construire le lien de partage (`SITE_URL?ref=code`). Si l'adresse du site change, mettez aussi à jour `og:url` et `og:image` dans `index.html`.

## Ce qui est envoyé

Un seul `POST` (`Content-Type: application/json`) à la fin, avec exactement les clés du brief (§ 6), dans cet ordre. Les valeurs des choix sont toujours en français, même si le répondant a lu le site en anglais (`langue` vaut alors `EN`). Un champ non rempli part vide : `""`, `[]`, `false` ou `null` pour les nombres.

Protections :

- champ caché `website` (honeypot) : s'il est rempli, on affiche le remerciement sans rien envoyer ;
- envoi refusé si le parcours a duré moins de 60 secondes (message « rempli trop vite ») ;
- en cas d'échec réseau : message clair et bouton « Réessayer ». Les réponses restent dans le navigateur (`localStorage`) jusqu'à un envoi réussi, puis sont effacées.

## Partage entre dentistes

Chaque navigateur reçoit un `code_partage` de 6 caractères (gardé dans `localStorage`). L'écran de fin propose le lien `SITE_URL?ref=<code>`. Quand quelqu'un arrive avec `?ref=xxx`, la valeur est gardée et envoyée dans `envoye_par`.

## Tester en local

Les fichiers JavaScript sont des modules : il faut un petit serveur (ouvrir `index.html` en double-clic ne marche pas).

```bash
python3 -m http.server 8000
```

Puis ouvrir http://localhost:8000. Astuces : `?lang=en` force l'anglais, `?ref=abc123` simule un lien de parrainage, le bouton « Recommencer » (en haut) efface les réponses en cours.

## Déployer / redéployer

Le site est servi par GitHub Pages depuis la branche `main`, dossier racine. Pour publier une modification :

```bash
git add -A
git commit -m "Texte de l'écran 4 modifié"
git push
```

GitHub Pages republie tout seul en une à deux minutes (onglet **Actions** du dépôt pour suivre).

Première mise en place (déjà faite si le site est en ligne) : créer le dépôt `alvea-etude`, pousser sur `main`, puis **Settings → Pages → Source : Deploy from a branch → `main` / `(root)`**.
