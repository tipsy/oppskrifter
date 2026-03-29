import { reactive } from 'vue';

export const store = reactive({
  recipes: [],
  currentRoute: parseRoute(),
  currentRecipe: null,
  loading: false,
  routines: [],
});

export function parseRoute() {
  const hash = window.location.hash || '#/';
  const path = hash.slice(1); // remove #

  if (path.startsWith('/edit/')) {
    const issueNumber = path.slice('/edit/'.length);
    return { page: 'edit', issueNumber };
  }
  if (path.startsWith('/recipe/')) {
    const issueNumber = path.slice('/recipe/'.length);
    return { page: 'detail', issueNumber };
  }
  if (path === '/new') {
    return { page: 'new' };
  }
  if (path.startsWith('/routine/')) {
    const issueNumber = path.slice('/routine/'.length);
    return { page: 'routine', issueNumber };
  }
  if (path === '/routine') {
    return { page: 'routine' };
  }
  return { page: 'list' };
}

export function navigateTo(path) {
  window.location.hash = path;
}

function onHashChange() {
  store.currentRoute = parseRoute();
}

window.addEventListener('hashchange', onHashChange);
