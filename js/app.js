import { createApp, ref, watch } from 'vue';
import { store } from './services/store.js';
import { t } from './services/i18n.js';
import { fetchAllIssues } from './services/github.js';
import { pat } from './services/config.js';
import { AppHeader } from './components/AppHeader.js';
import RecipeList from './components/RecipeList.js';
import RecipeDetail from './components/RecipeDetail.js';

import RecipeForm from './components/RecipeForm.js';
import RoutinePlanner from './components/RoutinePlanner.js';

const App = {
  components: { AppHeader, RecipeList, RecipeDetail, RecipeForm, RoutinePlanner },
  setup() {
    const patInput = ref('');

    // Load all data from GitHub on startup
    async function loadFromGitHub() {
      store.loading = true;
      try {
        const { recipes, routines } = await fetchAllIssues();
        store.recipes = recipes;
        store.routines = routines;
      } catch (err) {
        console.error('Failed to load data from GitHub:', err);
      } finally {
        store.loading = false;
      }
    }

    loadFromGitHub();

    // Re-fetch when PAT changes
    watch(pat, () => {
      if (pat.value) loadFromGitHub();
    });

    function savePat() {
      pat.value = patInput.value;
    }

    // Set current recipe from store when navigating to detail
    watch(
      () => store.currentRoute,
      (route) => {
        if (route.page === 'detail' && route.issueNumber) {
          const num = parseInt(route.issueNumber, 10);
          store.currentRecipe = store.recipes.find(r => r.issueNumber === num) || null;
        } else {
          store.currentRecipe = null;
        }
      },
      { immediate: true }
    );

    return { store, t, pat, patInput, savePat };
  },
  template: `
    <template v-if="!pat">
      <div class="auth-screen">
        <div class="auth-prompt__card">
          <h1 class="auth-prompt__title">Familieoppskrifter</h1>
          <div class="form-group">
            <label class="form-label" for="global-pat-input">Passord</label>
            <input
              id="global-pat-input"
              class="form-input"
              type="password"
              v-model="patInput"
              placeholder="Skriv inn passord"
              @keyup.enter="savePat"
            />
          </div>
          <button class="btn btn--primary" @click="savePat">Logg inn</button>
        </div>
      </div>
    </template>
    <template v-else>
      <AppHeader />
      <main class="app-main">
        <RecipeList v-if="store.currentRoute.page === 'list'" />
        <RecipeDetail v-else-if="store.currentRoute.page === 'detail'" :issueNumber="store.currentRoute.issueNumber" />
        <RecipeForm v-else-if="store.currentRoute.page === 'new' || store.currentRoute.page === 'edit'" />
        <RoutinePlanner v-else-if="store.currentRoute.page === 'routine'" />
      </main>
    </template>
  `
};

createApp(App).mount('#app');
