import { ref, computed, watch } from 'vue';
import { t } from '../services/i18n.js';
import { store, navigateTo } from '../services/store.js';
import { createIssue, updateIssue } from '../services/github.js';

export default {
  setup() {
    const title = ref('');
    const category = ref('');
    const servings = ref(4);
    const prepTime = ref('');
    const ingredients = ref('');
    const instructions = ref('');
    const error = ref('');
    const success = ref(false);
    const submitting = ref(false);

    const editingRecipe = computed(() => {
      if (store.currentRoute.page === 'edit' && store.currentRoute.issueNumber) {
        const num = parseInt(store.currentRoute.issueNumber, 10);
        return store.recipes.find(r => r.issueNumber === num) || null;
      }
      return null;
    });

    function parseBody(body) {
      if (!body) return { ingredients: '', instructions: '' };
      const lines = body.split('\n');
      let section = null;
      const sections = {};
      for (const line of lines) {
        const m = line.match(/^##\s+(.+)/);
        if (m) { section = m[1].trim().toLowerCase(); sections[section] = []; continue; }
        if (section && sections[section]) sections[section].push(line);
      }
      const ingKey = Object.keys(sections).find(k => k.includes('ingredient') || k.includes('ingrediens'));
      const insKey = Object.keys(sections).find(k => k.includes('instruction') || k.includes('instruksjon') || k.includes('fremgangsm'));
      const ing = ingKey ? sections[ingKey].map(l => l.replace(/^[-*]\s+/, '').trim()).filter(Boolean).join('\n') : '';
      const ins = insKey ? sections[insKey].map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean).join('\n') : '';
      return { ingredients: ing, instructions: ins };
    }

    watch(editingRecipe, (r) => {
      if (r) {
        title.value = r.title;
        category.value = r.category || '';
        servings.value = parseInt(r.servings, 10) || 4;
        prepTime.value = r.prepTime || '';
        const { ingredients: ing, instructions: ins } = parseBody(r.body);
        ingredients.value = ing;
        instructions.value = ins;
        success.value = false;
        error.value = '';
      }
    }, { immediate: true });

    function validate() {
      if (!title.value.trim()) {
        error.value = t('recipeForm.requiredFields');
        return false;
      }
      if (!ingredients.value.trim()) {
        error.value = t('recipeForm.requiredFields');
        return false;
      }
      error.value = '';
      return true;
    }

    function generateMarkdown() {
      const lines = ['---'];
      lines.push(`type: recipe`);
      lines.push(`title: ${title.value.trim()}`);
      if (category.value) {
        lines.push(`category: ${category.value}`);
      }
      lines.push(`servings: ${servings.value}`);
      if (prepTime.value.trim()) {
        lines.push(`prepTime: ${prepTime.value.trim()}`);
      }
      lines.push('---');
      lines.push('');

      // Ingredients
      lines.push('## Ingredients');
      const ingredientLines = ingredients.value.trim().split('\n').filter(l => l.trim());
      for (const line of ingredientLines) {
        lines.push(`- ${line.trim()}`);
      }
      lines.push('');

      // Instructions
      if (instructions.value.trim()) {
        lines.push('## Instructions');
        const stepLines = instructions.value.trim().split('\n').filter(l => l.trim());
        stepLines.forEach((line, i) => {
          lines.push(`${i + 1}. ${line.trim()}`);
        });
        lines.push('');
      }

      return lines.join('\n');
    }

    async function handleSubmit() {
      if (!validate()) return;

      submitting.value = true;
      error.value = '';
      try {
        const markdown = generateMarkdown();
        if (editingRecipe.value) {
          await updateIssue(editingRecipe.value.issueNumber, markdown, title.value.trim());
          const r = editingRecipe.value;
          r.title = title.value.trim();
          r.category = category.value || '';
          r.servings = String(servings.value);
          r.prepTime = prepTime.value.trim();
          r.body = markdown.split('---').slice(2).join('---').trim();
        } else {
          const issue = await createIssue(title.value.trim(), markdown);
          store.recipes.push({
            issueNumber: issue.number,
            title: issue.title,
            category: category.value || '',
            servings: String(servings.value),
            prepTime: prepTime.value.trim(),
            body: markdown.split('---').slice(2).join('---').trim(),
            slug: issue.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
          });
        }
        success.value = true;
      } catch (e) {
        error.value = e.message || t('errorLoading');
      } finally {
        submitting.value = false;
      }
    }

    function resetForm() {
      title.value = '';
      category.value = '';
      servings.value = 4;
      prepTime.value = '';
      ingredients.value = '';
      instructions.value = '';
      error.value = '';
      success.value = false;
    }

    return {
      title, category, servings, prepTime,
      ingredients, instructions, error, success, submitting,
      handleSubmit, resetForm, t, store, navigateTo, editingRecipe
    };
  },
  template: `
    <div class="recipe-form">
      <h1 class="page-title">{{ editingRecipe ? t('recipeForm.editTitle') : t('recipeForm.title') }}</h1>

        <div v-if="success" class="recipe-form__success">
          <p class="recipe-form__success-text">{{ editingRecipe ? t('recipeForm.updateSuccess') : t('recipeForm.successMessage') }}</p>
          <div class="recipe-form__success-actions">
            <button v-if="editingRecipe" class="btn btn--primary" @click="navigateTo('/recipe/' + editingRecipe.issueNumber)">{{ t('recipeForm.backToRecipe') }}</button>
            <button v-if="!editingRecipe" class="btn btn--primary" @click="resetForm">{{ t('recipeForm.createAnother') }}</button>
            <button class="btn btn--secondary" @click="navigateTo('/')">{{ t('recipeDetail.backToList') }}</button>
          </div>
        </div>

        <form v-else @submit.prevent="handleSubmit" novalidate>
          <div v-if="error" class="error-state" role="alert">{{ error }}</div>

          <div class="form-group">
            <label class="form-label" for="recipe-title">{{ t('recipeForm.nameLabel') }} *</label>
            <input
              id="recipe-title"
              class="form-input"
              :class="{'form-input--error': error && !title.trim()}"
              type="text"
              v-model="title"
              :placeholder="t('recipeForm.namePlaceholder')"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="recipe-category">{{ t('recipeForm.categoryLabel') }}</label>
            <select id="recipe-category" class="form-select" v-model="category">
              <option value="">{{ t('recipeForm.categorySelect') }}</option>
              <option value="dinner">{{ t('recipeForm.categoryDinner') }}</option>
              <option value="lunch">{{ t('recipeForm.categoryLunch') }}</option>
              <option value="dessert">{{ t('recipeForm.categoryDessert') }}</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="recipe-servings">{{ t('recipeForm.servingsLabel') }}</label>
            <input
              id="recipe-servings"
              class="form-input"
              type="number"
              v-model.number="servings"
              min="1"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="recipe-preptime">{{ t('recipeForm.prepTimeLabel') }}</label>
            <input
              id="recipe-preptime"
              class="form-input"
              type="text"
              v-model="prepTime"
              :placeholder="t('recipeForm.prepTimePlaceholder')"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="recipe-ingredients">{{ t('recipeForm.ingredientsLabel') }} *</label>
            <textarea
              id="recipe-ingredients"
              class="form-textarea"
              :class="{'form-textarea--error': error && !ingredients.trim()}"
              v-model="ingredients"
              :placeholder="t('recipeForm.ingredientsPlaceholder')"
              rows="6"
              required
            ></textarea>
          </div>

          <div class="form-group">
            <label class="form-label" for="recipe-instructions">{{ t('recipeForm.instructionsLabel') }}</label>
            <textarea
              id="recipe-instructions"
              class="form-textarea"
              v-model="instructions"
              :placeholder="t('recipeForm.instructionsPlaceholder')"
              rows="6"
            ></textarea>
          </div>

          <button type="submit" class="btn btn--primary" :disabled="submitting">
            {{ submitting ? t('loading') : (editingRecipe ? t('recipeForm.update') : t('recipeForm.submit')) }}
          </button>
        </form>
    </div>
  `
};
