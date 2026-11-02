# Airtable : colonnes de la base « Alvea — Étude de marché dentistes »

Une table (en service : `Réponses v2`), avec **une colonne par clé du payload**, avec exactement le même nom (accents et underscores compris). Le scénario Make fait alors un simple « Create a record » où chaque colonne reçoit la clé du même nom.

Les valeurs des choix sont **toujours en français**, même quand le répondant a lu le site en anglais (`langue` vaut alors `EN`). Pour les colonnes « Single select » et « Multiple select », créez les options à l'avance en les copiant telles quelles (apostrophes droites `'`, guillemets « » et espaces compris). Si votre module Make propose l'option *typecast* (création automatique des options), vous pouvez l'activer à la place.

Un champ non rempli **n'est pas envoyé** : la clé est absente du JSON (texte vide, liste vide ou nombre manquant). Les cases à cocher partent toujours (`true` / `false`). Dans Make, une clé absente donne une valeur vide : rien à changer dans le module « Create a record ».

## Clés techniques

| Clé | Type JSON | Colonne Airtable | Remarque |
| --- | --- | --- | --- |
| `langue` | texte | Single select : `FR`, `EN` | |
| `envoye_par` | texte | Single line text | `code_partage` de la personne qui a transmis le lien (`?ref=`), vide sinon |
| `code_partage` | texte | Single line text | Code de 6 caractères du répondant, utilisé dans son lien de partage |
| `duree_secondes` | nombre | Number (entier) | Durée totale du parcours |
| `utm` | texte | Single line text | Source de la visite : « source / medium / campaign » (`-` pour une valeur absente), par ex. `linkedin / profile / -`. Absente sans paramètres UTM |
| `website` | texte | *pas de colonne* | Piège à robots : sert seulement au filtre Make (« `website` est vide »). Normalement absent (vide), présent seulement si un robot l'a rempli |

## Réponses

| Clé | Type JSON | Colonne Airtable | Options (valeurs exactes) |
| --- | --- | --- | --- |
| `plans_acceptes_sur_10` | nombre | Number (entier) | 0 à 10 |
| `avis_reconnus` | liste | Multiple select | `explication_neg`, `explication_pos`, `cout_neg`, `cout_pos`, `delais_neg`, `delais_pos`, `surprise_neg`, `surprise_pos` |
| `avis_aucun` | booléen | Checkbox | |
| `difference_1_5` | texte | Single select | L'explication du traitement · Le prix · Les délais · L'accueil · Le résultat du soin |
| `profil` | texte | Single select | Dentiste généraliste · Orthodontiste · Parodontologue · Implantologue · Stomatologue / chirurgien maxillo-facial · Assistant(e) ou coordinateur(trice) de traitement · Gérant(e) de centre dentaire · Autre |
| `type_cabinet` | texte | Single select | Seul(e) · Cabinet de groupe · Centre dentaire / polyclinique · Hôpital / université |
| `annees_exercice` | texte | Single select | Moins de 5 ans · 5 à 15 ans · 15 à 25 ans · Plus de 25 ans |
| `part_implanto` | texte | Single select | Aucune · Moins de 20 % · 20 à 50 % · Plus de 50 % |
| `pays` | texte | Single line text (ou Single select avec *typecast* activé dans Make) | Nom du pays **en français**, quelle que soit la langue du site : liste mondiale (« Belgique », « Maroc », « États-Unis »…), ou « Autre » |
| `supports` | liste | Multiple select | À l'oral uniquement · Dessin sur papier · Radio (panoramique, rétro-alvéolaire) · Cone beam (radio 3D) · Caméra ou photos intrabuccales · Scan intraoral 3D · Modèle physique / maquette · Simulation du sourire (smile design, mock-up) · Photos avant/après d'autres patients · Vidéos, logiciel ou brochures explicatives · Devis écrit · Autre |
| `supports_autre` | texte | Single line text | |
| `qui_presente` | liste | Multiple select | Moi · Un(e) assistant(e) · Un(e) coordinateur(trice) de traitement · Le secrétariat |
| `temps_explication` | texte | Single select | Moins de 5 min · 5 à 15 min · 15 à 30 min · Plus de 30 min |
| `patient_repart_avec` | liste | Multiple select | Un devis papier · Un devis par mail · Un schéma ou dessin · Un document ou lien visuel · Rien d'écrit |
| `logiciel` | texte | Single line text | |
| `issue_refus` | texte | Single select | refuse clairement · dit « je vais réfléchir » et ne revient pas · choisit une option moins chère |
| `raison_principale` | texte | Single select | Le prix · Un remboursement insuffisant · Il n'a pas bien compris le plan · Trop de visites, trop long · La peur des soins · Il veut en parler à un proche · Il doute que ce soit nécessaire · Autre |
| `raison_autre` | texte | Single line text | |
| `demande_attentes` | texte | Single select | Souvent · Parfois · Rarement |
| `dernier_refus` | texte | Long text | |
| `questions_reposees` | texte | Long text | |
| `outil_essaye` | texte | Single select | Oui, j'en utilise un · Oui, mais abandonné · Non |
| `outil_detail` | texte | Long text | |
| `budget_actuel` | texte | Single select | 0 € · Moins de 50 € · 50 à 150 € · 150 à 400 € · Plus de 400 € · Je ne sais pas |
| `demo_score` | nombre | Number (entier) ou Rating (5) | 1 à 5 |
| `demo_chapitre_max` | nombre | Number (entier) | 0 à 7 (7 = démo vue en entier) |
| `demo_duree_secondes` | nombre | Number (entier) | Temps passé dans la démo |
| `elements_utiles` | liste | Multiple select | La bouche en 3D · Le plan visite par visite · Les attentes expliquées · Le devis par visite · Le lien envoyé au patient · Version FR / NL · Autre |
| `elements_autre` | texte | Single line text | |
| `dicter_realiste` | texte | Single select | Oui · Plutôt oui · Plutôt non · Non, je préférerais cliquer dans un menu |
| `prix_abonnement` | texte | Single select | Moins de 50 € · 50 à 100 € · 100 à 200 € · 200 à 400 € · Plus de 400 € · Je ne paierais pas pour ça |
| `manque` | texte | Long text | |
| `appel` | texte | Single select | Oui, avec plaisir · Plutôt par e-mail · Non merci |
| `implication` | liste | Multiple select | Être tenu(e) au courant de l'avancée · Tester les premières versions en avant-première, gratuitement · Donner mon avis régulièrement, dans un petit groupe de praticiens conseillers · M'impliquer davantage dans le projet (partenaire, associé) · Pas pour l'instant |
| `actif_au_dela` | liste | Multiple select | J'enseigne ou je donne des formations · Membre d'une association ou d'un groupe d'étude · Actif sur les réseaux sociaux · Non |
| `reseau_compte` | texte | Single line text | |
| `nom` | texte | Single line text | « Prénom Nom » (deux champs du formulaire, réunis) |
| `email` | texte | Email | En minuscules, sans espaces |
| `consentement` | booléen | Checkbox | Toujours `true` (obligatoire pour envoyer) |

Colonnes à ajouter vous-même (pas dans le payload) :

| Colonne | Type | Rôle |
| --- | --- | --- |
| `recu_le` | Created time | Date de réception |
| `nb_relais` | Number (entier), 0 par défaut | Nombre de réponses arrivées avec `envoye_par` = son `code_partage` (rempli par Make, voir plus bas) |
| `score_priorite` | Formula | Voir ci-dessous |
| `statut` | Single select : À rappeler · RDV pris · Appelé · Pas de suite | Suivi à la main |

## Scénario Make

1. **Webhooks › Custom webhook** : collez son URL dans `etude/js/config.js` (`WEBHOOK_URL`). Pour qu'il apprenne la structure, cliquez « Redetermine data structure » puis envoyez `docs/test-payload.json` :

   ```bash
   curl -X POST -H "Content-Type: application/json" --data @docs/test-payload.json "URL_DU_WEBHOOK"
   ```

2. **Filtre** entre le webhook et Airtable : `website` *Text operators: Equal to* (vide). Ou « Does not exist / is empty ».
3. **Airtable › Create a record** dans la table `Réponses v2` : chaque colonne reçoit la clé du même nom. Les listes (`supports`, `implication`…) se branchent directement sur les colonnes Multiple select.
4. **Webhook response** (facultatif) : statut 200. Sans ce module, Make répond « Accepted », ce qui suffit au site.
5. **Relais (facultatif, pour le +1 du score)** : après la création, ajoutez une route avec le filtre `envoye_par` *n'est pas vide*, puis **Airtable › Search records** avec la formule `{code_partage} = '{{envoye_par}}'`, puis **Airtable › Update a record** sur le résultat : `nb_relais` = `{{nb_relais + 1}}`.

## Formule `score_priorite`

À coller dans une colonne de type Formula :

```
IF({appel} = "Oui, avec plaisir", 3, 0)
+ IF(FIND("M'impliquer davantage", {implication} & ""), 3, 0)
+ IF(FIND("groupe de praticiens conseillers", {implication} & ""), 2, 0)
+ IF(FIND("J'enseigne", {actif_au_dela} & ""), 2, 0)
+ IF(FIND("association", {actif_au_dela} & ""), 1, 0)
+ IF(FIND("réseaux sociaux", {actif_au_dela} & ""), 1, 0)
+ IF(OR({profil} = "Implantologue", {part_implanto} = "20 à 50 %", {part_implanto} = "Plus de 50 %"), 1, 0)
+ IF({nb_relais} > 0, 1, 0)
```

| Signal | Points |
| --- | --- |
| `appel` = Oui, avec plaisir | +3 |
| `implication` contient « M'impliquer davantage » | +3 |
| `implication` contient « groupe de praticiens conseillers » | +2 |
| `actif_au_dela` contient « J'enseigne » | +2 |
| `actif_au_dela` contient « association » | +1 |
| `actif_au_dela` contient « réseaux sociaux » | +1 |
| `profil` = Implantologue, ou `part_implanto` ≥ 20 % | +1 |
| Quelqu'un a répondu via son lien (`nb_relais` > 0) | +1 (nécessite l'étape 5 du scénario ; sinon, retirez la dernière ligne) |

Score maximum : 14.

## Vue suggérée « À rappeler »

- Type : Grid.
- Filtre : `email` n'est pas vide **et** `statut` n'est pas « Pas de suite ».
- Tri : `score_priorite` décroissant, puis `recu_le` croissant.
- Colonnes visibles en premier : `nom`, `email`, `appel`, `implication`, `actif_au_dela`, `reseau_compte`, `score_priorite`, `statut`.
