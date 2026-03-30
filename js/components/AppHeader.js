import { ref } from 'vue';
import { t } from '../services/i18n.js';
import { store, navigateTo } from '../services/store.js';
import { fetchAllIssues } from '../services/github.js';

export const AppHeader = {
  setup() {
    const refreshing = ref(false);
    const menuOpen = ref(false);

    function goTo(path) {
      menuOpen.value = false;
      navigateTo(path);
    }

    async function refresh() {
      menuOpen.value = false;
      refreshing.value = true;
      try {
        const { recipes, routines } = await fetchAllIssues();
        store.recipes = recipes;
        store.routines = routines;
      } finally {
        refreshing.value = false;
      }
    }

    function logout() {
      menuOpen.value = false;
      localStorage.clear();
      location.reload();
    }

    return { store, t, goTo, refreshing, refresh, menuOpen, logout };
  },

  template: `
    <header class="app-header">
      <div class="app-header__inner app-frame">
        <a href="#/" class="app-header__title" @click.prevent="goTo('/')">
          {{ t('app.title') }}
        </a>
        <button class="hamburger" @click="menuOpen = !menuOpen" aria-label="Menu">
          <span class="hamburger__line"></span>
          <span class="hamburger__line"></span>
          <span class="hamburger__line"></span>
        </button>
        <nav class="nav-links" :class="{ 'nav-links--open': menuOpen }">
          <a href="#/"
             class="nav-link"
             :class="{ 'nav-link--active': store.currentRoute.page === 'list' }"
             @click.prevent="goTo('/')">
            {{ t('nav.recipes') }}
          </a>
          <a href="#/new"
             class="nav-link"
             :class="{ 'nav-link--active': store.currentRoute.page === 'new' }"
             @click.prevent="goTo('/new')">
            {{ t('nav.newRecipe') }}
          </a>
          <a href="#/routine"
             class="nav-link"
             :class="{ 'nav-link--active': store.currentRoute.page === 'routine' }"
             @click.prevent="goTo('/routine')">
            {{ t('nav.routine') }}
          </a>
          <button
            class="nav-link refresh-btn"
            :disabled="refreshing"
            @click="refresh">
            {{ refreshing ? '...' : '↻' }}<span class="refresh-btn__label"> {{ t('nav.refresh') }}</span>
          </button>
          <button
            class="nav-link logout-btn"
            @click="logout">
            ⏻<span class="logout-btn__label"> Logg ut</span>
          </button>
        </nav>
      </div>
    </header>
  `
};
