import { ref, computed, watch } from 'vue';
import { t } from '../services/i18n.js';
import { store, navigateTo } from '../services/store.js';
import { updateIssue, createIssue } from '../services/github.js';

const DAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];
const DAY_KEYS = DAYS.map(d => d.toLowerCase());

const DAY_I18N = {
  'mandag': 'routine.monday',
  'tirsdag': 'routine.tuesday',
  'onsdag': 'routine.wednesday',
  'torsdag': 'routine.thursday',
  'fredag': 'routine.friday',
  'lørdag': 'routine.saturday',
  'søndag': 'routine.sunday',
};

export default {
  setup() {
    const routine = ref({});
    const saving = ref(false);
    const saveMessage = ref('');
    const newPlanName = ref('');
    const creating = ref(false);

    const isEditView = computed(() => !!store.currentRoute.issueNumber);

    const currentRoutine = computed(() => {
      if (!store.currentRoute.issueNumber) return null;
      const num = parseInt(store.currentRoute.issueNumber, 10);
      return store.routines.find(r => r.issueNumber === num) || null;
    });

    const recipes = computed(() => store.recipes);

    // Initialize/update routine ref when currentRoutine changes
    watch(currentRoutine, (r) => {
      if (r) {
        const map = {};
        for (const key of DAY_KEYS) {
          map[key] = r.days[key] || '';
        }
        routine.value = map;
      }
    }, { immediate: true });

    function getRecipeTitle(issueNumber) {
      if (!issueNumber) return '';
      const num = parseInt(issueNumber, 10);
      const recipe = recipes.value.find(r => r.issueNumber === num);
      return recipe ? recipe.title : issueNumber;
    }

    function assignRecipe(dayKey, issueNumber) {
      routine.value[dayKey] = issueNumber;
    }

    function clearDay(dayKey) {
      routine.value[dayKey] = '';
    }

    function generateRoutineMarkdown() {
      const lines = ['---', 'type: routine', '---', ''];
      for (const day of DAYS) {
        const key = day.toLowerCase();
        lines.push(`## ${day}`);
        lines.push(routine.value[key] || '');
        lines.push('');
      }
      return lines.join('\n');
    }

    async function saveRoutine() {
      const r = currentRoutine.value;
      if (!r) {
        saveMessage.value = t('routine.saveError');
        return;
      }
      saving.value = true;
      saveMessage.value = '';
      try {
        const md = generateRoutineMarkdown();
        await updateIssue(r.issueNumber, md);
        // Update store
        for (const key of DAY_KEYS) {
          r.days[key] = routine.value[key];
        }
        saveMessage.value = t('routine.saveSuccess');
      } catch (e) {
        saveMessage.value = t('routine.saveError');
        console.error('Failed to save routine:', e);
      } finally {
        saving.value = false;
      }
    }

    async function createNewPlan() {
      const name = newPlanName.value.trim();
      if (!name) return;
      creating.value = true;
      try {
        const body = [
          '---',
          'type: routine',
          '---',
          '',
          '## Mandag',
          '',
          '## Tirsdag',
          '',
          '## Onsdag',
          '',
          '## Torsdag',
          '',
          '## Fredag',
          '',
          '## Lørdag',
          '',
          '## Søndag',
          '',
        ].join('\n');
        const issue = await createIssue(name, body);
        const newRoutine = {
          issueNumber: issue.number,
          title: issue.title,
          body: '',
          meta: { type: 'routine' },
          days: {},
        };
        store.routines.push(newRoutine);
        newPlanName.value = '';
        navigateTo(`/routine/${issue.number}`);
      } catch (e) {
        console.error('Failed to create routine:', e);
      } finally {
        creating.value = false;
      }
    }

    return {
      routine, recipes, saving, saveMessage, DAY_KEYS, DAY_I18N,
      getRecipeTitle, assignRecipe, clearDay, saveRoutine,
      isEditView, currentRoutine, newPlanName, creating, createNewPlan,
      t, navigateTo, store
    };
  },
  template: `
    <div class="routine-planner">
      <!-- List View -->
      <template v-if="!isEditView">
        <h1 class="page-title">{{ t('routine.list.title') }}</h1>
        <p class="page-subtitle">{{ t('routine.list.subtitle') }}</p>

        <div v-if="store.loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>{{ t('loading') }}</p>
        </div>

        <template v-else>
          <div v-if="store.routines.length === 0" class="empty-state">
            <span class="empty-state__text">{{ t('routine.empty') }}</span>
          </div>

          <div v-else class="routine-list-view">
            <a v-for="r in store.routines" :key="r.issueNumber"
               class="routine-list-item"
               :href="'#/routine/' + r.issueNumber"
               @click.prevent="navigateTo('/routine/' + r.issueNumber)">
              <span class="routine-list-item__name">{{ r.title }}</span>
            </a>
          </div>

          <div class="routine-new-form">
            <input
              class="form-input routine-new-form__input"
              type="text"
              v-model="newPlanName"
              :placeholder="t('routine.namePlaceholder')"
              @keyup.enter="createNewPlan"
            />
            <button
              class="btn btn--primary"
              @click="createNewPlan"
              :disabled="creating || !newPlanName.trim()"
            >
              {{ creating ? t('loading') : t('routine.create') }}
            </button>
          </div>
        </template>
      </template>

      <!-- Edit View -->
      <template v-else>
        <a href="#/routine" class="routine-detail__back" @click.prevent="navigateTo('/routine')">
          {{ t('routine.backToList') }}
        </a>

        <template v-if="currentRoutine">
          <h1 class="page-title">{{ currentRoutine.title }}</h1>
          <p class="page-subtitle">{{ t('routine.subtitle') }}</p>

          <div class="routine-days">
            <div v-for="dayKey in DAY_KEYS" :key="dayKey" class="routine-row">
              <label class="routine-row__day">{{ t(DAY_I18N[dayKey]) }}</label>

              <div class="routine-row__select-wrap">
                <select class="form-select routine-row__select"
                  :value="routine[dayKey]"
                  @change="assignRecipe(dayKey, $event.target.value)">
                  <option value="">{{ t('routine.selectRecipe') }}</option>
                  <option v-for="recipe in recipes" :key="recipe.issueNumber" :value="String(recipe.issueNumber)">
                    {{ recipe.title }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div v-if="saveMessage" class="routine-planner__message" style="margin-top: 12px;">
            <p>{{ saveMessage }}</p>
          </div>

          <div class="routine-planner__actions">
            <button
              class="btn btn--primary"
              @click="saveRoutine"
              :disabled="saving"
            >
              {{ saving ? t('loading') : t('routine.save') }}
            </button>
          </div>
        </template>

        <div v-else class="empty-state">
          <span class="empty-state__text">{{ t('routine.empty') }}</span>
        </div>
      </template>
    </div>
  `
};
