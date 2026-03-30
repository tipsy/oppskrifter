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
            <span class="nav-link__icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zM21 18.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/></svg></span>
            {{ t('nav.recipes') }}
          </a>
          <a href="#/new"
             class="nav-link"
             :class="{ 'nav-link--active': store.currentRoute.page === 'new' }"
             @click.prevent="goTo('/new')">
            <span class="nav-link__icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg></span>
            {{ t('nav.newRecipe') }}
          </a>
          <a href="#/routine"
             class="nav-link"
             :class="{ 'nav-link--active': store.currentRoute.page === 'routine' }"
             @click.prevent="goTo('/routine')">
            <span class="nav-link__icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/></svg></span>
            {{ t('nav.routine') }}
          </a>
          <button
            class="nav-link refresh-btn"
            :disabled="refreshing"
            @click="refresh">
            <span class="nav-link__icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg></span>
            <span class="refresh-btn__label">{{ t('nav.refresh') }}</span>
          </button>
          <button
            class="nav-link logout-btn"
            @click="logout">
            <span class="nav-link__icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg></span>
            <span class="logout-btn__label">Logg ut</span>
          </button>
        </nav>
      </div>
    </header>
  `
};
