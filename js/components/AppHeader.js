import { t } from '../services/i18n.js';
import { store, navigateTo } from '../services/store.js';

export const AppHeader = {
  setup() {
    function goTo(path) {
      navigateTo(path);
    }

    return { store, t, goTo };
  },

  template: `
    <header class="app-header">
      <div class="app-header__inner">
        <a href="#/" class="app-header__title" @click.prevent="goTo('/')">
          {{ t('app.title') }}
        </a>
        <div class="app-header__actions">
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
        </div>
      </div>
    </header>
  `
};
