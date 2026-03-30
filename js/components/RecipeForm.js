import { ref, computed, watch, nextTick } from 'vue';
import { t } from '../services/i18n.js';
import { store, navigateTo } from '../services/store.js';
import { createIssue, updateIssue } from '../services/github.js';
import { uploadToCloudinary } from '../services/cloudinary.js';

export default {
  setup() {
    const title = ref('');
    const category = ref('dinner');
    const servings = ref(2);
    const prepTime = ref('');
    const image = ref('');
    const ingredients = ref(['']);
    const instructions = ref(['']);
    const ingredientRefs = ref([]);
    const instructionRefs = ref([]);
    const error = ref('');
    const success = ref(false);
    const submitting = ref(false);

    // Drag-and-drop reordering state
    const dragIndex = ref(null);
    const dragList = ref(null);

    // Image upload state
    const uploading = ref(false);
    const uploadError = ref('');
    const dragover = ref(false);

    function handleImageFile(file) {
      if (!file || !file.type.startsWith('image/')) return;
      uploading.value = true;
      uploadError.value = '';
      uploadToCloudinary(file)
        .then(url => {
          image.value = url;
        })
        .catch(err => {
          uploadError.value = err.message || 'Opplasting feilet';
        })
        .finally(() => {
          uploading.value = false;
        });
    }

    function onFileSelect(e) {
      const file = e.target.files?.[0];
      if (file) handleImageFile(file);
      e.target.value = '';
    }

    function onDropImage(e) {
      e.preventDefault();
      dragover.value = false;
      const file = e.dataTransfer?.files?.[0];
      if (file) handleImageFile(file);
    }

    function onDragOverImage(e) {
      e.preventDefault();
      dragover.value = true;
    }

    function onDragLeaveImage() {
      dragover.value = false;
    }

    function removeImage() {
      image.value = '';
      uploadError.value = '';
    }

    const editingRecipe = computed(() => {
      if (store.currentRoute.page === 'edit' && store.currentRoute.issueNumber) {
        const num = parseInt(store.currentRoute.issueNumber, 10);
        return store.recipes.find(r => r.issueNumber === num) || null;
      }
      return null;
    });

    async function addIngredient() {
      if (ingredients.value.length > 0 && !ingredients.value[ingredients.value.length - 1].trim()) return;
      ingredients.value.push('');
      await nextTick();
      const els = ingredientRefs.value;
      if (els.length > 0) els[els.length - 1].focus();
    }
    function removeIngredient(index) {
      ingredients.value.splice(index, 1);
      if (ingredients.value.length === 0) ingredients.value.push('');
    }
    async function addInstruction() {
      if (instructions.value.length > 0 && !instructions.value[instructions.value.length - 1].trim()) return;
      instructions.value.push('');
      await nextTick();
      const els = instructionRefs.value;
      if (els.length > 0) els[els.length - 1].focus();
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
        servings.value = parseInt(r.servings, 10) || 2;
        prepTime.value = parseInt(r.prepTime, 10) || '';
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
        error.value = 'Fyll ut oppskriftsnavn';
        return false;
      }
      if (!category.value) {
        error.value = 'Velg en kategori';
        return false;
      }
      if (!servings.value || servings.value < 1) {
        error.value = 'Fyll ut antall porsjoner';
        return false;
      }
      if (!prepTime.value || prepTime.value < 5 || prepTime.value > 180) {
        error.value = 'Tilberedningstid må være mellom 5 og 180 minutter';
        return false;
      }
      if (!ingredients.value.some(i => i.trim())) {
        error.value = 'Legg til minst én ingrediens';
        return false;
      }
      if (!instructions.value.some(i => i.trim())) {
        error.value = 'Legg til minst ett steg';
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
      if (prepTime.value) {
        lines.push(`prepTime: ${prepTime.value}`);
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
          r.prepTime = String(prepTime.value || '');
          r.image = image.value.trim();
          r.body = markdown.split('---').slice(2).join('---').trim();
        } else {
          const issue = await createIssue(title.value.trim(), markdown);
          store.recipes.push({
            issueNumber: issue.number,
            title: issue.title,
            category: category.value || '',
            servings: String(servings.value),
            prepTime: String(prepTime.value || ''),
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
      category.value = 'dinner';
      servings.value = 2;
      prepTime.value = '';
      image.value = '';
      ingredients.value = [''];
      instructions.value = [''];
      error.value = '';
      success.value = false;
      uploadError.value = '';
    }

    return {
      title, category, servings, prepTime, image,
      ingredients, instructions, ingredientRefs, instructionRefs,
      error, success, submitting,
      handleSubmit, resetForm, t, store, navigateTo, editingRecipe,
      addIngredient, removeIngredient, addInstruction, removeInstruction,
      onDragStart, onDragOver, onDrop, onDragEnd,
      uploading, uploadError, dragover,
      onFileSelect, onDropImage, onDragOverImage, onDragLeaveImage, removeImage
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
              <label class="form-label" for="recipe-title">{{ t('recipeForm.nameLabel') }}</label>
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
              <label class="form-label" for="recipe-preptime">{{ t('recipeForm.prepTimeLabel') }} (minutter)</label>
              <input
                id="recipe-preptime"
                class="form-input"
                type="number"
                min="5"
                max="180"
                v-model.number="prepTime"
                placeholder="30"
              />
            </div>
          </div>

            <div class="form-group">
              <label class="form-label">Bilde</label>

              <div v-if="image.trim()" class="image-preview">
                <img :src="image.trim()" alt="Preview" class="image-preview__img" />
                <button type="button" class="glass-pill image-upload__label" @click="removeImage">Fjern bilde</button>
              </div>

              <div v-else-if="uploading" class="image-upload-area">
                <div class="image-upload-area__content">
                  <div class="loading-spinner" style="margin-bottom: 0;"></div>
                  <div class="image-upload-area__text">Laster opp...</div>
                </div>
              </div>

              <div v-else
                class="image-upload-area"
                :class="{ 'image-upload-area--dragover': dragover }"
                @dragover="onDragOverImage"
                @dragleave="onDragLeaveImage"
                @drop="onDropImage"
                @click="$refs.fileInput.click()"
              >
                <div class="image-upload-area__content">
                  <div class="image-upload-area__icon">📷</div>
                  <div class="image-upload-area__text">Dra et bilde hit, eller trykk for å velge</div>
                  <div class="image-upload-area__subtext">JPG, PNG — komprimeres automatisk</div>
                </div>
              </div>

              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                class="image-upload__input"
                @change="onFileSelect"
              />

              <div v-if="uploadError" class="image-upload__status" style="color: var(--color-dinner);">{{ uploadError }}</div>
            </div>

          <div class="form-row form-row--2col">
            <div class="form-group">
                <label class="form-label">{{ t('recipeForm.ingredientsLabel') }}</label>
                <div class="input-list">
                  <div v-for="(item, index) in ingredients" :key="'ing-' + index" class="input-list__row"
                       draggable="true"
                       @dragstart="onDragStart('ingredients', index, $event)"
                       @dragover.prevent="onDragOver($event)"
                       @drop="onDrop('ingredients', index, $event)"
                       @dragend="onDragEnd">
                    <div class="input-list__field">
                      <span class="input-list__drag-handle" title="Dra for å endre rekkefølge">⠿</span>
                      <input
                        :ref="el => { if (el) ingredientRefs[index] = el }"
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

            <div class="form-group">
                <label class="form-label">{{ t('recipeForm.instructionsLabel') }}</label>
                <div class="input-list">
                  <div v-for="(item, index) in instructions" :key="'ins-' + index" class="input-list__row"
                       draggable="true"
                       @dragstart="onDragStart('instructions', index, $event)"
                       @dragover.prevent="onDragOver($event)"
                       @drop="onDrop('instructions', index, $event)"
                       @dragend="onDragEnd">
                    <div class="input-list__field">
                      <span class="input-list__drag-handle" title="Dra for å endre rekkefølge">⠿</span>
                      <div class="input-list__numbered">
                        <span class="input-list__number">{{ index + 1 }}.</span>
                        <input
                          :ref="el => { if (el) instructionRefs[index] = el }"
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

          <button type="submit" class="btn btn--primary" :disabled="submitting">
            {{ submitting ? t('loading') : (editingRecipe ? t('recipeForm.update') : t('recipeForm.submit')) }}
          </button>
        </form>
    </div>
  `
};
