const translations = {
  // App
  'app.title': 'Familieoppskrifter',

  // Nav
  'nav.recipes': 'Oppskrifter',
  'nav.newRecipe': 'Ny oppskrift',
  'nav.routine': 'Ukeplan',
  'nav.refresh': 'Oppdater',

  // Recipe list
  recipesTitle: 'Våre oppskrifter',
  loading: 'Laster…',
  errorLoading: 'Kunne ikke laste oppskrifter.',
  filterByCategory: 'Filtrer etter kategori',
  categoryAll: 'Alle',
  categoryDinner: 'Middag',
  categoryLunch: 'Lunsj',
  categoryDessert: 'Dessert',
  category_dinner: 'Middag',
  category_lunch: 'Lunsj',
  category_dessert: 'Dessert',
  noRecipes: 'Ingen oppskrifter funnet.',
  recipeList: 'Oppskriftsliste',
  servings: 'porsjoner',
  'suggest.button': 'Foreslå middag',

  // Recipe detail
  'recipeDetail.ingredients': 'Ingredienser',
  'recipeDetail.instructions': 'Fremgangsmåte',
  'recipeDetail.notFound': 'Oppskriften ble ikke funnet.',
  'recipeDetail.delete': 'Slett oppskrift',
  'recipeDetail.edit': 'Rediger',
  'recipeDetail.confirmDelete': 'Er du sikker på at du vil slette denne oppskriften?',
  backToRecipes: 'Tilbake til oppskrifter',

  // Recipe form
  'recipeForm.title': 'Ny oppskrift',
  'recipeForm.nameLabel': 'Oppskriftsnavn',
  'recipeForm.namePlaceholder': 'f.eks. Bestemors eplekake',
  'recipeForm.categoryLabel': 'Kategori',
  'recipeForm.categorySelect': 'Velg kategori',
  'recipeForm.categoryDinner': 'Middag',
  'recipeForm.categoryLunch': 'Lunsj',
  'recipeForm.categoryDessert': 'Dessert',
  'recipeForm.servingsLabel': 'Porsjoner',
  'recipeForm.prepTimeLabel': 'Tilberedningstid',
  'recipeForm.prepTimePlaceholder': 'f.eks. 30 min',
  'recipeForm.ingredientsLabel': 'Ingredienser',
  'recipeForm.instructionsLabel': 'Fremgangsmåte',
  'recipeForm.submit': 'Lagre oppskrift',
  'recipeForm.requiredFields': 'Vennligst fyll ut alle obligatoriske felt.',
  'recipeForm.successMessage': 'Oppskriften ble lagret!',
  'recipeForm.createAnother': 'Lag en til',
  'recipeForm.editTitle': 'Rediger oppskrift',
  'recipeForm.update': 'Lagre endringer',
  'recipeForm.updateSuccess': 'Oppskriften ble oppdatert!',
  'recipeForm.backToRecipe': 'Tilbake til oppskrift',

  // Routine / weekly planner
  'routine.subtitle': 'Planlegg ukens måltider',
  'routine.save': 'Lagre ukeplan',
  'routine.saveSuccess': 'Ukeplan lagret!',
  'routine.saveError': 'Kunne ikke lagre ukeplan',
  'routine.list.title': 'Ukeplaner',
  'routine.list.subtitle': 'Planlegg ukens måltider',
  'routine.namePlaceholder': 'Navn på ukeplan...',
  'routine.create': 'Opprett',
  'routine.backToList': '\u2190 Tilbake til ukeplaner',
  'routine.delete': 'Slett ukeplan',
  'routine.confirmDelete': 'Er du sikker på at du vil slette denne ukeplanen?',
  'routine.empty': 'Ingen ukeplaner enn\u00e5',
  'routine.selectRecipe': 'Velg oppskrift...',
  'routine.monday': 'Mandag',
  'routine.tuesday': 'Tirsdag',
  'routine.wednesday': 'Onsdag',
  'routine.thursday': 'Torsdag',
  'routine.friday': 'Fredag',
  'routine.saturday': 'Lørdag',
  'routine.sunday': 'Søndag',
};

export function t(key) {
  return translations[key] ?? key;
}
