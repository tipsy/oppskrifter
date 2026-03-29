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
    const image = ref('');
    const ingredients = ref(['']);
    const instructions = ref(['']);
    const error = ref('');
    const success = ref(false);
    const submitting = ref(false);

    // Drag-and-drop reordering state
    const dragIndex = ref(null);
    const dragList = ref(null);

    const editingRecipe = computed(() => {
      if (store.currentRoute.page === 'edit' && store.currentRoute.issueNumber) {
        const num = parseInt(store.currentRoute.issueNumber, 10);
        return store.recipes.find(r => r.issueNumber === num) || null;
      }
      return null;
    });

    function addIngredient() {
      ingredients.value.push('');
    }
    function removeIngredient(index) {
      ingredients.value.splice(index, 1);
      if (ingredients.value.length === 0) ingredients.value.push('');
    }
    function addInstruction() {
      instructions.value.push('');
    }
    function removeInstruction(index) {
      instructions.value.splice(index, 1);
      if (instructions.value.length === 0) instructions.value.push('');
    }

    function onDragStart(list, index, event) {
      dragIndex.value = index;
      dragList.value = list;
      event.dataTransfer.effectAllowed = 'move';
    }

    function onDragOver(event) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    }

    function onDrop(list, targetIndex, event) {
      event.preventDefault();
      if (dragList.value !== list || dragIndex.value === null) return;
      const arr = list === 'ingredients' ? ingredients : instructions;
      const item = arr.value.splice(dragIndex.value, 1)[0];
      arr.value.splice(targetIndex, 0, item);
      dragIndex.value = null;
      dragList.value = null;
    }

    function onDragEnd() {
      dragIndex.value = null;
      dragList.value = null;
    }

    function parseBody(body) {
      if (!body) return { ingredients: [''], instructions: [''] };
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
      const ing = ingKey ? sections[ingKey].map(l => l.replace(/^[-*]\s+/, '').trim()).filter(Boolean) : [''];
      const ins = insKey ? sections[insKey].map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean) : [''];
      return { ingredients: ing, instructions: ins };
    }

    watch(editingRecipe, (r) => {
      if (r) {
        title.value = r.title;
        category.value = r.category || '';
        servings.value = parseInt(r.servings, 10) || 4;
        prepTime.value = r.prepTime || '';
        image.value = r.image || '';
        const { ingredients: ing, instructions: ins } = parseBody(r.body);
        ingredients.value = ing.length ? ing : [''];
        instructions.value = ins.length ? ins : [''];
        success.value = false;
        error.value = '';
      }
    }, { immediate: true });

    function validate() {
      if (!title.value.trim()) {
        error.value = t('recipeForm.requiredFields');
        return false;
      }
      if (!ingredients.value.some(i => i.trim())) {
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
      if (image.value.trim()) {
        lines.push(`image: ${image.value.trim()}`);
      }
      lines.push('---');
      lines.push('');

      // Ingredients
      lines.push('## Ingredients');
      const ingredientLines = ingredients.value.filter(l => l.trim());
      for (const line of ingredientLines) {
        lines.push(`- ${line.trim()}`);
      }
      lines.push('');

      // Instructions
      const stepLines = instructions.value.filter(l => l.trim());
      if (stepLines.length > 0) {
        lines.push('## Instructions');
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
          r.image = image.value.trim();
          r.body = markdown.split('---').slice(2).join('---').trim();
        } else {
          const issue = await createIssue(title.value.trim(), markdown);
          store.recipes.push({
            issueNumber: issue.number,
            title: issue.title,
            category: category.value || '',
            servings: String(servings.value),
            prepTime: prepTime.value.trim(),
            image: image.value.trim(),
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
      image.value = '';
      ingredients.value = [''];
      instructions.value = [''];
      error.value = '';
      success.value = false;
    }

    return {
      title, category, servings, prepTime, image,
      ingredients, instructions, error, success, submitting,
      handleSubmit, resetForm, t, store, navigateTo, editingRecipe,
      addIngredient, removeIngredient, addInstruction, removeInstruction,
      onDragStart, onDragOver, onDrop, onDragEnd
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

          <div class="form-section">
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

            <div class="form-row">
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
          </div>

            <div class="form-group">
              <label class="form-label" for="recipe-image">Bilde-URL</label>
              <input
                id="recipe-image"
                class="form-input"
                type="url"
                v-model="image"
                placeholder="https://example.com/bilde.jpg"
              />
            </div>
          </div>

          <div class="form-row form-row--2col">
            <div class="form-section">
              <div class="form-group">
                <label class="form-label">{{ t('recipeForm.ingredientsLabel') }} *</label>
                <div class="input-list">
                  <div v-for="(item, index) in ingredients" :key="'ing-' + index" class="input-list__row"
                       draggable="true"
                       @dragstart="onDragStart('ingredients', index, $event)"
                       @dragover.prevent="onDragOver($event)"
                       @drop="onDrop('ingredients', index, $event)"
                       @dragend="onDragEnd">
                    <span class="input-list__drag-handle" title="Dra for å endre rekkefølge">⠿</span>
                    <div class="input-list__field">
                      <input
                        class="form-input"
                        :class="{'form-input--error': error && index === 0 && !ingredients.some(i => i.trim())}"
                        type="text"
                        v-model="ingredients[index]"
                        :placeholder="'Ingrediens ' + (index + 1)"
                        @keydown.enter.prevent="addIngredient"
                      />
                      <button v-if="ingredients.length > 1" type="button" class="input-list__remove" @click="removeIngredient(index)" title="Fjern">&times;</button>
                    </div>
                  </div>
                  <button type="button" class="input-list__add" @click="addIngredient">+ Legg til ingrediens</button>
                </div>
              </div>
            </div>

            <div class="form-section">
              <div class="form-group">
                <label class="form-label">{{ t('recipeForm.instructionsLabel') }}</label>
                <div class="input-list">
                  <div v-for="(item, index) in instructions" :key="'ins-' + index" class="input-list__row"
                       draggable="true"
                       @dragstart="onDragStart('instructions', index, $event)"
                       @dragover.prevent="onDragOver($event)"
                       @drop="onDrop('instructions', index, $event)"
                       @dragend="onDragEnd">
                    <span class="input-list__drag-handle" title="Dra for å endre rekkefølge">⠿</span>
                    <div class="input-list__field">
                      <div class="input-list__numbered">
                        <span class="input-list__number">{{ index + 1 }}.</span>
                        <input
                          class="form-input"
                          type="text"
                          v-model="instructions[index]"
                          :placeholder="'Steg ' + (index + 1)"
                          @keydown.enter.prevent="addInstruction"
                        />
                      </div>
                      <button v-if="instructions.length > 1" type="button" class="input-list__remove" @click="removeInstruction(index)" title="Fjern">&times;</button>
                    </div>
                  </div>
                  <button type="button" class="input-list__add" @click="addInstruction">+ Legg til steg</button>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" class="btn btn--primary" :disabled="submitting">
            {{ submitting ? t('loading') : (editingRecipe ? t('recipeForm.update') : t('recipeForm.submit')) }}
          </button>
        </form>
    </div>
  `
};
