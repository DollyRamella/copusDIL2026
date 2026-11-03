/*
 * CONFIGURATION DU SITE — seul fichier à modifier avant la mise en ligne.
 *
 * Tant que firebase.apiKey est vide, le site fonctionne en MODE DÉMONSTRATION :
 * les données restent dans le navigateur de la personne qui teste (rien n'est partagé).
 * Pour la collecte réelle, renseignez la configuration Firebase (voir README.md, étape 2).
 */
window.APP_CONFIG = {
  // Textes affichés dans l'en-tête et le titre des pages
  siteTitle: "Corpus des étudiants",
  siteSubtitle: "Séminaire de fin de semestre",
  // Facultatif : adresse d'un logo (fichier placé dans le dossier assets/, ex. "assets/logo.png")
  logoUrl: "",
  // Facultatif : adresse de contact PUBLIQUE (ex. adresse fonctionnelle du service) pour demander le retrait d'une fiche.
  // Ne mettez pas ici l'adresse utilisée pour l'authentification de gestion.
  contactPublic: "",

  // Configuration Firebase (Console Firebase > Paramètres du projet > Vos applications > Application Web)
  firebase: {
    apiKey: "AIzaSyC8KpXp9GQh7DZN5YHoyN_7ATXMbbTzdIM",
    authDomain: "corpusdil.firebaseapp.com",
    projectId: "corpusdil",
    appId: "1:127545258705:web:0b7e5aa0fb306092b90bf0"
  },

  // Images : formats acceptés et limites
  maxImageMB: 5,          // taille maximale du fichier téléversé
  imageMaxWidth: 1200,    // largeur maximale après redimensionnement (px)
  imageTargetKB: 350      // poids visé après compression (ko)
};
