import { ref, computed } from 'vue';
import { store } from '../services/store.js';
import { t } from '../services/i18n.js';

export default {
  name: 'RecipeList',

  setup() {
    const activeCategory = ref('all');

    const recipes = computed(() => store.recipes);

    const categories = computed(() => [
      { key: 'all',     label: t('categoryAll') },
      { key: 'dinner',  label: t('categoryDinner') },
      { key: 'lunch',   label: t('categoryLunch') },
      { key: 'dessert', label: t('categoryDessert') },
    ]);

    const filteredRecipes = computed(() => {
      if (activeCategory.value === 'all') return recipes.value;
      return recipes.value.filter(r => r.category === activeCategory.value);
    });

    function setCategory(cat) {
      activeCategory.value = cat;
    }

    function navigateToRecipe(issueNumber) {
      window.location.hash = `#/recipe/${issueNumber}`;
    }

    function handleCardKeydown(event, issueNumber) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        navigateToRecipe(issueNumber);
      }
    }

    function suggestRandom() {
      const dinners = recipes.value.filter(r => r.category === 'dinner');
      if (dinners.length === 0) return;
      const recipe = dinners[Math.floor(Math.random() * dinners.length)];
      navigateToRecipe(recipe.issueNumber);
    }

    return {
      recipes,
      activeCategory,
      categories,
      filteredRecipes,
      setCategory,
      navigateToRecipe,
      handleCardKeydown,
      suggestRandom,
      t,
      store,
    };
  },

  template: /* html */ `
    <div>
      <h1 class="page-title">{{ t('recipesTitle') }}</h1>
      <p class="page-subtitle">{{ t('recipesSubtitle') }}</p>

      <!-- Loading State -->
      <div v-if="store.loading" class="loading-state" role="status" aria-live="polite">
        <span class="loading-spinner" aria-hidden="true"></span>
        <p>{{ t('loading') }}</p>
      </div>

      <!-- Content -->
      <template v-else>
        <!-- Category Filter -->
        <div class="category-filter-row">
          <nav :aria-label="t('filterByCategory')">
            <ul class="category-filter" role="list">
              <li v-for="cat in categories" :key="cat.key">
                <button
                  type="button"
                  class="category-filter__btn"
                  :class="[
                    'category-filter__btn--' + cat.key,
                    { 'category-filter__btn--active': activeCategory === cat.key }
                  ]"
                  :aria-pressed="activeCategory === cat.key ? 'true' : 'false'"
                  @click="setCategory(cat.key)"
                >
                  <span
                    v-if="cat.key !== 'all'"
                    class="category-filter__dot"
                    aria-hidden="true"
                  ></span>
                  {{ cat.label }}
                </button>
              </li>
            </ul>
          </nav>
          <button type="button" class="meta-pill" @click="suggestRandom" style="cursor: pointer; border: none;">
            {{ t('suggest.button') }} &rarr;
          </button>
        </div>

        <!-- Empty State -->
        <div v-if="filteredRecipes.length === 0" class="empty-state">
          <span class="empty-state__icon" aria-hidden="true">&#127869;</span>
          <p class="empty-state__text">{{ t('noRecipes') }}</p>
        </div>

        <!-- Recipe Grid -->
        <div
          v-else
          class="recipe-grid"
          role="list"
          :aria-label="t('recipeList')"
        >
          <article
            v-for="recipe in filteredRecipes"
            :key="recipe.issueNumber"
            class="recipe-card"
            role="listitem"
            tabindex="0"
            @click="navigateToRecipe(recipe.issueNumber)"
            @keydown="handleCardKeydown($event, recipe.issueNumber)"
          >
            <div class="recipe-card__image">
              <img :src="recipe.image || 'img/placeholder.svg'" :alt="recipe.title" />
            </div>

            <span
              class="category-badge"
              :class="'category-badge--' + recipe.category"
            >
              {{ t('category_' + recipe.category) || recipe.category }}
            </span>

            <h2 class="recipe-card__title">{{ recipe.title }}</h2>

            <div class="recipe-card__meta">
              <span v-if="recipe.prepTime" class="recipe-card__meta-item">
                <span aria-hidden="true">&#9201;</span>
                {{ recipe.prepTime }}
              </span>
              <span v-if="recipe.servings" class="recipe-card__meta-item">
                <span aria-hidden="true">&#127860;</span>
                {{ recipe.servings }} {{ t('servings') }}
              </span>
            </div>
          </article>
        </div>
      </template>
    </div>
  `,
};
