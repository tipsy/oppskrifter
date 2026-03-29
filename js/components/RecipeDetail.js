import { ref, computed, watch } from 'vue';
import { store, navigateTo } from '../services/store.js';
import { t } from '../services/i18n.js';
import { closeIssue } from '../services/github.js';

/**
 * Parse a markdown body into structured sections.
 * Extracts ## Ingredients and ## Instructions (or localized equivalents).
 */
function parseRecipeBody(body) {
  if (!body) return { ingredients: [], instructions: [] };

  const lines = body.split('\n');
  let currentSection = null;
  const sections = {};

  for (const line of lines) {
    // Detect section headings (## Heading)
    const headingMatch = line.match(/^##\s+(.+)/);
    if (headingMatch) {
      currentSection = headingMatch[1].trim().toLowerCase();
      sections[currentSection] = [];
      continue;
    }

    if (currentSection && sections[currentSection]) {
      sections[currentSection].push(line);
    }
  }

  // Extract ingredients: lines starting with "- " or "* "
  const ingredientsKey = Object.keys(sections).find(k =>
    k.includes('ingredient') || k.includes('ingrediens')
  );
  const ingredients = ingredientsKey
    ? sections[ingredientsKey]
        .map(l => l.replace(/^[-*]\s+/, '').trim())
        .filter(Boolean)
    : [];

  // Extract instructions: lines starting with "1. " or any numbered line, or plain lines
  const instructionsKey = Object.keys(sections).find(k =>
    k.includes('instruction') || k.includes('instruksjon') ||
    k.includes('steps') || k.includes('fremgangsm')
  );
  const instructions = instructionsKey
    ? sections[instructionsKey]
        .map(l => l.replace(/^\d+\.\s*/, '').trim())
        .filter(Boolean)
    : [];

  return { ingredients, instructions };
}

export default {
  name: 'RecipeDetail',

  props: {
    issueNumber: {
      type: [String, Number],
      required: true,
    },
  },

  setup(props) {
    const recipe = computed(() => {
      const num = parseInt(props.issueNumber, 10);
      return store.recipes.find(r => r.issueNumber === num) || null;
    });

    const adjustedServings = ref(1);

    const originalServings = computed(() => {
      if (!recipe.value || !recipe.value.servings) return 1;
      return parseInt(recipe.value.servings, 10) || 1;
    });

    const parsed = computed(() => {
      if (!recipe.value) return { ingredients: [], instructions: [] };
      return parseRecipeBody(recipe.value.body);
    });

    const scaledIngredients = computed(() => {
      const ratio = adjustedServings.value / originalServings.value;
      if (ratio === 1) return parsed.value.ingredients;
      return parsed.value.ingredients.map(item => {
        return item.replace(/^(\d+(?:[.,]\d+)?)/, (match) => {
          const num = parseFloat(match.replace(',', '.'));
          const scaled = num * ratio;
          const result = parseFloat(scaled.toFixed(1));
          return String(result);
        });
      });
    });

    function increment() {
      adjustedServings.value++;
    }

    function decrement() {
      if (adjustedServings.value > 1) {
        adjustedServings.value--;
      }
    }

    // Checkbox tracking for cooking mode
    const checkedInstructions = ref(new Set());

    function toggleInstruction(index) {
      const s = checkedInstructions.value;
      if (s.has(index)) s.delete(index);
      else s.add(index);
      checkedInstructions.value = new Set(s);
    }

    // Reset servings and checkboxes when recipe changes
    watch(recipe, (r) => {
      if (r) {
        adjustedServings.value = originalServings.value;
        checkedInstructions.value = new Set();
      }
    }, { immediate: true });

    function goBack() {
      window.location.hash = '#/';
    }

    const deleting = ref(false);

    async function deleteRecipe() {
      if (!window.confirm(t('recipeDetail.confirmDelete'))) return;
      deleting.value = true;
      try {
        await closeIssue(recipe.value.issueNumber);
        const idx = store.recipes.findIndex(r => r.issueNumber === recipe.value.issueNumber);
        if (idx !== -1) store.recipes.splice(idx, 1);
        window.location.hash = '#/';
      } catch (err) {
        console.error('Failed to delete recipe:', err);
        alert(err.message);
        deleting.value = false;
      }
    }

    return {
      recipe,
      parsed,
      scaledIngredients,
      adjustedServings,
      increment,
      decrement,
      goBack,
      deleting,
      deleteRecipe,
      navigateTo,
      t,
      store,
      checkedInstructions,
      toggleInstruction,
    };
  },

  template: /* html */ `
    <div class="recipe-detail">
      <!-- Loading State -->
      <div v-if="store.loading" class="loading-state" role="status" aria-live="polite">
        <span class="loading-spinner" aria-hidden="true"></span>
        <p>{{ t('loading') }}</p>
      </div>

      <!-- Not Found State -->
      <div v-else-if="!recipe" class="error-state" role="alert">
        <p>{{ t('recipeDetail.notFound') }}</p>
        <button class="btn btn--secondary" style="margin-top: 16px" @click="goBack">
          {{ t('backToRecipes') }}
        </button>
      </div>

      <!-- Recipe Content -->
      <template v-else>
        <!-- Toolbar: back link + utility actions -->
        <div class="recipe-detail__toolbar">
          <a
            href="#/"
            class="recipe-detail__back"
            @click.prevent="goBack"
          >
            <span aria-hidden="true">&larr;</span>
            {{ t('backToRecipes') }}
          </a>
          <div class="recipe-detail__toolbar-actions">
            <button class="btn-icon" @click="navigateTo('/edit/' + recipe.issueNumber)" :title="t('recipeDetail.edit')">
              {{ t('recipeDetail.edit') }}
            </button>
            <button class="btn-icon btn-icon--danger" @click="deleteRecipe" :disabled="deleting" :title="t('recipeDetail.delete')">
              {{ deleting ? t('loading') : t('recipeDetail.delete') }}
            </button>
          </div>
        </div>

        <!-- Header -->
        <header class="recipe-detail__header">
          <h1 class="recipe-detail__title">{{ recipe.title }}</h1>

          <div class="recipe-detail__meta">
            <span class="meta-pill">
              <span class="meta-pill__dot" :class="'meta-pill__dot--' + recipe.category"></span>
              {{ t('category_' + recipe.category) || recipe.category }}
            </span>
            <span v-if="recipe.prepTime" class="meta-pill">
              &#9201; {{ recipe.prepTime }}
            </span>
            <span v-if="recipe.servings" class="meta-pill servings-adjuster">
              <button @click="decrement" :disabled="adjustedServings <= 1" class="servings-adjuster__btn" aria-label="-1"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="3" y1="7" x2="11" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
              <span class="servings-adjuster__count">{{ adjustedServings }}</span>
              <button @click="increment" class="servings-adjuster__btn" aria-label="+1"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="7" y1="3" x2="7" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="3" y1="7" x2="11" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
              <span class="servings-adjuster__label">{{ t('servings') }}</span>
            </span>
          </div>
        </header>

        <!-- Ingredients -->
        <section
          v-if="parsed.ingredients.length > 0"
          class="recipe-section"
          aria-labelledby="ingredients-heading"
        >
          <h2 id="ingredients-heading" class="recipe-section__title">
            {{ t('recipeDetail.ingredients') }}
          </h2>
          <ul class="ingredients-list">
            <li v-for="(item, index) in scaledIngredients" :key="index">{{ item }}</li>
          </ul>
        </section>

        <!-- Instructions -->
        <section
          v-if="parsed.instructions.length > 0"
          class="recipe-section"
          aria-labelledby="instructions-heading"
        >
          <h2 id="instructions-heading" class="recipe-section__title">
            {{ t('recipeDetail.instructions') }}
          </h2>
          <ol class="instructions-list">
            <li v-for="(step, index) in parsed.instructions" :key="index"
                class="instruction-step"
                :class="{ 'instruction-step--done': checkedInstructions.has(index) }">
              <span class="instruction-step__number" v-if="!checkedInstructions.has(index)">{{ index + 1 }}</span>
              <span class="instruction-step__check" v-else>✓</span>
              <span class="instruction-step__text">{{ step }}</span>
              <button class="instruction-step__done-btn" @click="toggleInstruction(index)">
                {{ checkedInstructions.has(index) ? 'Angre' : 'Ferdig' }}
              </button>
            </li>
          </ol>
        </section>

      </template>
    </div>
  `,
};
