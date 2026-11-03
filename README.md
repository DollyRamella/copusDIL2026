# Corpus des étudiants — collecte, validation et microsite

Site statique (HTML/CSS/JavaScript, aucun outil de compilation) à héberger gratuitement, par exemple sur GitHub Pages. Les données sont enregistrées dans Firebase (Firestore), donc durables et accessibles depuis tous les appareils.

## Parcours

1. Les groupes ouvrent `depot.html`, créent le compte de leur groupe (e-mail + mot de passe), remplissent une fiche (brouillon possible), l'envoient et peuvent la modifier jusqu'à la date limite.
2. Vous ouvrez `gestion.html` : vous voyez toutes les fiches, repérez les informations manquantes, corrigez, demandez des modifications ou validez.
3. Vous publiez une fiche validée : elle apparaît dans la galerie de `index.html` (le microsite). Vous pouvez la dépublier ou mettre à jour sa publication sans rien ressaisir.

## Ce qui fonctionne tout de suite, et ce qui demande une configuration

| Élément | État |
|---|---|
| Interface complète (dépôt, gestion, galerie, recherche, fiche détaillée, export CSV) | Fonctionne dès l'ouverture des fichiers, en **mode démonstration** : les données restent dans le navigateur de la personne qui teste et ne sont partagées avec personne. |
| Stockage partagé durable, comptes e-mail + mot de passe, accès protégé, un groupe = ses propres fiches | **À configurer** (étapes 1 à 5 ci-dessous). Le code est écrit pour Firebase mais n'a pas pu être testé contre un vrai projet Firebase pendant la réalisation. |
| Règles de sécurité (`firestore.rules`) | **À publier et à tester** dans le simulateur de règles de la console avant la collecte (étape 4). |
| Hébergement | **À faire** (étape 6). |

Pour essayer la démonstration : ouvrez `index.html` dans un navigateur. Dans `gestion.html`, connectez-vous avec `enseignante@demo.local`, puis « Charger des exemples ». Les exemples sont étiquetés « [EXEMPLE] » ; le bouton « Supprimer les exemples » les retire. Dans `depot.html`, n'importe quelle adresse fonctionne en démonstration.

## 100 % gratuit

Tout reste sur le forfait gratuit de Firebase (**Spark**) : Firestore (base de données) et Authentication (comptes e-mail + mot de passe). Ne passez jamais au forfait Blaze et n'activez pas Cloud Storage, qui est le seul service nécessitant le forfait payant. Sur le forfait gratuit, un service dont le quota est dépassé est suspendu jusqu'à la période suivante : aucune facturation (sources 1 et 4). La connexion par lien e-mail a été écartée car elle est limitée à 5 e-mails par jour sur ce forfait (source 5). L'hébergement doit lui aussi être gratuit (voir étape 6 : vérifiez les conditions de votre hébergeur).

## Mise en route

### 1. Créer le projet Firebase
Sur https://console.firebase.google.com : créer un projet, puis ajouter une application Web (icône `</>`). Firebase affiche un objet de configuration (`apiKey`, `authDomain`, `projectId`, `appId`).

Rester sur le forfait **Spark** (gratuit) : si la console propose de « passer à Blaze » ou d'ajouter un moyen de paiement, refusez. Dans **Build > Firestore Database**, créer la base (mode production, édition Standard). Ne pas activer Cloud Storage : il n'est pas utilisé.

### 2. Renseigner `assets/config.js`
Recopier l'objet de configuration dans la section `firebase`, et ajuster `siteTitle`, `siteSubtitle`, éventuellement `logoUrl` (logo à placer dans `assets/`) et `contactPublic` (adresse **publique** de contact pour un retrait de fiche, pas votre adresse d'authentification). Dès que `apiKey` est renseignée, le bandeau « Mode démonstration » disparaît.

### 3. Activer la connexion par e-mail et mot de passe
Dans **Build > Authentication > Méthode de connexion** : activer le fournisseur **E-mail/Mot de passe** (laisser « Lien envoyé par e-mail » désactivé). Dans **Authentication > Paramètres > Domaines autorisés**, ajouter le domaine du site (par exemple `votre-compte.github.io`, sans `https://`) : il sert au lien de l'e-mail de vérification de votre compte.

### 4. Publier les règles de sécurité
Ouvrir `firestore.rules`, remplacer `REMPLACER-PAR-ADRESSE-ENSEIGNANTE@exemple.fr` par votre adresse de gestion **en minuscules**, copier tout le fichier dans **Firestore Database > Règles**, puis **Publier**. Tester ensuite avec le simulateur de règles de la console.

Ce que les règles imposent : seule votre adresse accède à tout ; un groupe lit et modifie uniquement les fiches créées avec son adresse ; plus aucune écriture étudiante après la date limite ou collecte fermée, ni après validation ; le public ne lit que la collection `publications`, qui ne contient aucune adresse e-mail.

### 5. Créer votre compte de gestion et ouvrir la collecte
Dans **Authentication > Utilisateurs > Ajouter un utilisateur**, créez votre compte avec l'adresse déclarée à l'étape 4 et un mot de passe. Faites-le **avant** de communiquer le site aux étudiants. Ouvrez ensuite `gestion.html` et connectez-vous. Au premier accès, la gestion vous demande de vérifier votre adresse : cliquez sur « Envoyer l'e-mail de vérification », ouvrez le lien reçu, puis « J'ai vérifié mon adresse : actualiser ». Réglez alors « Collecte ouverte » et la **date limite**, puis Enregistrer. Tant que ce réglage n'a pas été enregistré, les étudiants voient que la collecte n'est pas ouverte. Communiquer aux étudiants le lien vers `depot.html`.

### 6. Héberger le site
GitHub Pages : créer un dépôt, y déposer le contenu de ce dossier (`index.html`, `depot.html`, `gestion.html`, `assets/`), puis **Settings > Pages** et choisir la branche. Le microsite public est `index.html`. Tout hébergeur de fichiers statiques convient aussi.

## Au quotidien

- **Vérifier** : dans `gestion.html`, les fiches « envoyées » apparaissent en premier ; la colonne « Informations manquantes » repère les champs vides. « Ouvrir » permet de corriger directement le texte.
- **Demander des modifications** : rédigez un message, il s'affiche dans la liste de fiches du groupe, qui peut alors corriger et renvoyer. Si la fiche était publiée, elle est retirée du microsite pendant les corrections.
- **Valider** : possible seulement si tous les champs obligatoires sont renseignés. Une fiche validée n'est plus modifiable par les étudiants.
- **Publier** : « Valider et publier ». Il faut un lien de présentation valide, une image et son texte alternatif. « Dépublier » retire la fiche du microsite sans la supprimer.
- **Mettre à jour** : si vous corrigez une fiche publiée, le badge « À mettre à jour » apparaît ; « Mettre à jour la publication » recopie la version corrigée sur le microsite.
- **Préparer le séminaire** : « Exporter en tableau (CSV) » (séparateur point-virgule, ouvrable dans Excel ou LibreOffice). L'export contient les adresses de contact : ne le diffusez pas.
- **Clore** : décocher « Collecte ouverte » ou laisser la date limite passer.

## Confidentialité

- Noms, images et liens ne sont publics qu'après validation et publication par vous ; les étudiants doivent cocher une case d'accord de publication de leur groupe avant l'envoi.
- Les adresses e-mail ne sont stockées que dans les fiches privées (visibles du groupe et de vous) et jamais dans les publications.
- Un message d'information figure en pied de chaque page.
- Prévoyez de supprimer les fiches et comptes à la fin de la période de conservation que vous aurez fixée (suppression des fiches depuis la gestion ; suppression des comptes depuis la console Firebase).

## Choix techniques et limites

- **Images stockées dans Firestore, pas dans Cloud Storage** : les projets Firebase doivent désormais être sur le forfait payant Blaze pour utiliser Cloud Storage (source 1). Les images sont donc redimensionnées dans le navigateur (JPEG, environ 350 ko, 1 200 px de large) et enregistrées dans la fiche ; un document Firestore est limité à 1 Mio (source 3), ce qui laisse une large marge.
- **Quotas gratuits Firestore** : la documentation indique 1 Gio de stockage, 50 000 lectures et 20 000 écritures par jour (sources 3 et 4). Une classe n'en approche pas, mais ces valeurs peuvent changer : vérifiez-les à l'ouverture de la collecte.
- **Un compte par groupe** (adresse e-mail + mot de passe) : il donne accès aux fiches du groupe ; les membres partagent le mot de passe. Les e-mails de réinitialisation de mot de passe (150 par jour sur le forfait gratuit, source 5) et de vérification (1 000 par jour) suffisent largement pour une classe. Un système de co-éditeurs pourrait s'ajouter plus tard.
- **Un seul compte de gestion** dans les règles ; pour en ajouter, ajouter des adresses dans la liste de `isAdmin()`.
- Liens : seules les adresses `https://` sont acceptées, et elles s'ouvrent dans un nouvel onglet.

## Sources consultées

1. Firebase, changements de Cloud Storage (forfait Blaze requis) : https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024
2. Firebase, connexion par lien e-mail pour le Web (non retenue ici) : https://firebase.google.com/docs/auth/web/email-link-auth
3. Firestore, quotas et limites : https://docs.cloud.google.com/firestore/quotas
4. Firebase, forfaits (Spark : produits gratuits et quotas sans facturation) : https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
5. Firebase Authentication, limites (5 e-mails de connexion par lien par jour sur Spark ; 150 réinitialisations et 1 000 vérifications par jour) : https://firebase.google.com/docs/auth/limits
