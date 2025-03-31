/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * For customizations, you can adjust these values based on your requirements.
 */

const tintColorLight = '#59388A'; // Couleur primaire pour le mode clair
const tintColorDark = '#59388A';  // Couleur primaire pour le mode sombre
const backgroundDark = '#1A141F'; // Fond par défaut du mode sombre

export const Colors = {
  light: {
    text: '#11181C', // Texte par défaut pour le mode clair
    background: '#fff', // Fond par défaut pour le mode clair
    primary: '#59388A', // Couleur primaire en mode clair
    tint: tintColorLight, // Couleur pour les icônes ou autres éléments interactifs en mode clair
    icon: '#687076', // Couleur des icônes par défaut
    tabIconDefault: '#687076', // Icônes par défaut dans les tabs
    tabIconSelected: tintColorLight, // Icônes sélectionnées dans les tabs
  },
  dark: {
    text: '#fff', // Texte en blanc pour le mode sombre
    background: backgroundDark, // Fond personnalisé en mode sombre
    primary: '#59388A', // Couleur primaire en mode sombre
    tint: tintColorDark, // Couleur pour les icônes ou autres éléments interactifs en mode sombre
    icon: '#9BA1A6', // Couleur des icônes en mode sombre
    tabIconDefault: '#9BA1A6', // Icônes par défaut dans les tabs en mode sombre
    tabIconSelected: tintColorDark, // Icônes sélectionnées dans les tabs en mode sombre
  },
};
