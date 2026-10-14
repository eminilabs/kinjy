# Creator Studio — bilan de préparation et fournisseurs

Date : 14 octobre 2026. Périmètre : code et environnement de développement local.
Ce document ne constitue pas une validation de la production.

## Éléments livrés pendant la recette

- Gestion des publications programmées dans `/studio` : liste, modification de l'heure,
  publication immédiate, annulation avec confirmation et rafraîchissement.
- Rafraîchissement des crédits après une génération et indication de l'allocation Free
  tant que les abonnements payants ne sont pas raccordés.
- Respect de la langue du membre au chargement du formulaire.
- Messages cohérents pour les mineurs : création dans la langue d'origine possible,
  traduction externe, monétisation et envoi de newsletters réservés aux adultes confirmés.
- Rafraîchissement de la liste des abonnés newsletter et indication de l'absence de SMTP.
- Une recherche de génération invalide n'affiche plus les résultats de la précédente.
- Les téléchargements demandent une pièce jointe au serveur média, y compris lorsque
  celui-ci utilise une autre origine ; les signatures d'accès restent vérifiées.
- L'API du frontend de développement utilise `/api` sur la même origine au lieu d'une
  adresse `localhost` absolue, pour permettre les accès depuis un autre appareil.
- Page publique `/studio/privacy` décrivant les transferts, le cache et la conservation
  effectivement implémentés. Ce texte technique doit être intégré à la politique générale
  et ses engagements contractuels doivent être confirmés avant ouverture commerciale.
- Recette navigateur reproductible : `backend/tests/e2e_studio_ui.py`.

## Fournisseurs et accès à obtenir

| Besoin | Fournisseur / solution | Constat vérifié le 14 octobre | Action attendue |
|---|---|---|---|
| Traduction réelle | IleAI → OpenAI, moteur conversationnel `gpt-5-mini` | Clé de test présente ; une phrase de test a effectivement été traduite en français par l'adaptateur. L'IA réelle est désactivée dans la configuration locale normale. | Confirmer le compte et le budget de production, les conditions de traitement des textes et le moteur autorisé ; activer après recette. Une clé OpenAI directe n'est pas nécessaire pour ce chemin via IleAI. |
| Traduction spécialisée | DeepL via IleAI | L'appel valide à `/v1/translate` a renvoyé HTTP 503 `all_providers_unavailable`, bien que `/v1/status` annonce DeepL `healthy`. | Faire intervenir le support IleAI ; fournir l'identifiant de requête `21f0da26-a9ca-4918-8c42-bc6aaa363cfb`. Ce chemin est indisponible lors du contrôle, sans bloquer le moteur conversationnel déjà fonctionnel. |
| Confirmation des abonnés et envoi réel de newsletters | Fournisseur SMTP ; Resend est déjà mentionné dans les anciennes notes de production | Aucun SMTP configuré dans l'environnement local normal. Aucun envoi newsletter vers une vraie boîte effectué dans cette recette. Cela ne prouve pas que Resend est en panne. | Fournir/configurer hôte, port, utilisateur et secret SMTP, expéditeur et domaine vérifiés, adresse postale de l'expéditeur ; désigner une boîte de recette autorisée. Prévoir le traitement des rebonds et plaintes. |
| Encaissement des abonnements | NOWPayments, pour le chemin crypto existant | Clé API et secret IPN absents dans l'environnement contrôlé ; le service fonctionne en simulation. | Obtenir les accès, configurer un callback public vérifiable et raccorder les paiements confirmés aux droits Basic/Premium. Les identifiants seuls ne terminent pas ce raccordement. |
| Paiement bancaire | Mangopay, si ce moyen est retenu | Identifiants absents ; la création d'un paiement réel n'est pas implémentée dans `payment-service/rails.py`. | Obtenir les accès puis terminer et tester l'intégration. Une simple configuration ne suffit pas. NOWPayments et Mangopay sont des chemins différents ; les deux ne sont pas indispensables pour une première offre payante. |
| Narration, carrousels et vidéos de diapositives | espeak-ng, Pillow et FFmpeg, exécutés sur les serveurs Kinjy | Outils intégrés ; aucune clé fournisseur externe nécessaire. La voix est synthétique et peu naturelle. | Aucun achat fournisseur requis pour le fonctionnement actuel. Une voix neuronale reste une amélioration facultative à sélectionner et intégrer. |

## Limites qui demandent du développement, pas seulement un fournisseur

- Les abonnements sont enregistrés sans preuve de paiement. Le commutateur
  `AI_CREDITS_TRUST_SUBSCRIPTIONS` reste désactivé par défaut ; tous les membres gardent
  l'allocation Free. Ne pas l'activer comme substitut à une facturation confirmée.
- La programmation des posts reste ouverte à tous ; les restrictions Basic/Premium
  restent à raccorder aux droits réellement payés.
- L'endpoint de revenus créateur reste une simulation ; la génération et la publication
  de contenus ne valident pas un encaissement ou un versement réel.
- Pas encore de gestion des rebonds/plaintes newsletter, ni d'édition ou programmation
  d'une campagne, ni d'écran de gestion des abonnements côté lecteur.
- Les textes du Studio sont en anglais ; la traduction de l'interface et la relecture
  des sorties swahili/arabe/chinois par des locuteurs restent à faire.
- Le doublage d'une vidéo importée, la synchronisation des lèvres, le copilot, le brand kit
  et les agents autonomes appartiennent à une phase supplémentaire.
- Le cache des traductions conserve les textes sans expiration automatique et peut être
  partagé entre comptes adultes. La suppression d'une génération ne supprime pas ce cache.
  Une politique de durée et de suppression doit encore être arrêtée et implémentée.

## Validation

- Tests unitaires IA, quotas, plans, traduction Studio et liens newsletter : **151 réussis**.
- Signatures des médias : **61 tests unitaires réussis**.
- Recette API du Studio : **64 contrôles réussis**.
- Recette API des posts programmés : **26 contrôles réussis**, dont la publication
  automatique par le planificateur à l'heure prévue.
- Compilation TypeScript et production Vite : réussie dans le conteneur web.
- Page publique d'information sur les données : vérifiée dans Chromium à 390 px,
  sans débordement horizontal ; capture inspectée.
- Recette Chromium du Studio : **16 contrôles réussis**, sans erreur JavaScript non
  capturée : six formats et lecteurs, téléchargement, programmation et gestion des posts,
  inscription/confirmation/envoi/désinscription newsletter sur serveur simulé, modes clair
  et sombre, largeur téléphone, mineur, langue initiale et génération inexistante.
  Captures inspectées dans `/tmp/kinjy-studio-ui/`.
- La suite complète `e2e_creator_media.py` n'est **pas validée sur cette passe** : le
  rechargement du service média pendant la correction a fait échouer un enregistrement vidéo.
  Les six formats et leurs aperçus/téléchargements ont ensuite été revérifiés dans la recette
  navigateur réussie. Les limites extrêmes et toutes les langues n'ont pas été rejouées jusqu'au bout.
- La traduction réelle a été vérifiée directement via l'adaptateur IleAI. Le parcours complet
  Studio → fournisseur réel n'a pas été rejoué aujourd'hui ; les notes du 13 octobre en
  rapportent une validation. Le décompte des crédits repose ici sur les tests unitaires,
  sans dépense réelle depuis le navigateur.
- Envoi réel de newsletter : bloqué par l'absence de configuration SMTP et de boîte de recette.
- Aucun déploiement en production effectué pendant cette intervention.
- L'environnement local normal est remis en place après la recette : IA réelle désactivée,
  droits payants non approuvés automatiquement, serveur SMTP simulé retiré.

Le module possède son socle fonctionnel. Son ouverture commerciale reste conditionnée
à la recette complète, à la livraison réelle des e-mails et au raccordement de la facturation.

## Rejouer les vérifications

Compilation et contrôle des fichiers du Studio :

```sh
docker compose exec -T web npm run build
docker compose exec -T web npx eslint src/pages/app/Studio.tsx src/pages/NewsletterSubscribe.tsx src/pages/StudioPrivacy.tsx src/components/studio src/lib/api.ts
```

Les scripts API utilisent `httpx`. La recette navigateur demande aussi `playwright`
et Chromium (par défaut `/usr/bin/google-chrome`, configurable avec `KINJY_CHROMIUM`).
Les fichiers `compose.fake-smtp.yml` et `compose.fake-ileai.yml` sont des configurations
de test local ; ils ne doivent pas être utilisés pour un déploiement commercial.
Ne pas lancer la recette newsletter qui tue volontairement creator-service en parallèle
d'une génération média ou de la recette navigateur.
