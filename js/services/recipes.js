import { store } from './store.js';

/**
 * Parse YAML frontmatter from a markdown string.
 * Expects --- delimiters. Handles simple key: value pairs.
 */
export function parseRecipe(mdContent) {
  const lines = mdContent.split('\n');
  const meta = {};
  let body = mdContent;

  if (lines[0]?.trim() === '---') {
    let endIndex = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        endIndex = i;
        break;
      }
    }
    if (endIndex > 0) {
      // Parse frontmatter
      for (let i = 1; i < endIndex; i++) {
        const line = lines[i];
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          const key = line.slice(0, colonIdx).trim();
          const value = line.slice(colonIdx + 1).trim();
          meta[key] = value;
        }
      }
      body = lines.slice(endIndex + 1).join('\n').trim();
    }
  }

  return { meta, body };
}

export async function loadRecipeIndex() {
  const response = await fetch('recipes/index.json');
  if (!response.ok) throw new Error('Failed to load recipe index');
  const slugs = await response.json();
  const recipes = await Promise.all(slugs.map(loadRecipe));
  return recipes;
}

export async function loadRecipe(slug) {
  const response = await fetch(`recipes/${slug}.md`);
  if (!response.ok) throw new Error(`Failed to load recipe: ${slug}`);
  const mdContent = await response.text();
  const { meta, body } = parseRecipe(mdContent);
  return { slug, ...meta, body };
}

export async function loadAllRecipes() {
  store.loading = true;
  try {
    const slugs = await loadRecipeIndex();
    const recipes = await Promise.all(slugs.map(loadRecipe));
    store.recipes = recipes;
  } catch (err) {
    console.error('Failed to load recipes:', err);
    store.recipes = [];
  } finally {
    store.loading = false;
  }
}
