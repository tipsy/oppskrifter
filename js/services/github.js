import { pat, GITHUB_OWNER, GITHUB_REPO } from './config.js';

const API_BASE = 'https://api.github.com';

function headers() {
  const h = { 'Accept': 'application/vnd.github.v3+json' };
  if (pat.value) {
    h['Authorization'] = `Bearer ${pat.value}`;
  }
  return h;
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Parse YAML frontmatter from a markdown string.
 * Expects --- delimiters. Handles simple key: value pairs.
 */
function parseFrontmatter(mdContent) {
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

/**
 * Parse a routine body into a day→value mapping.
 */
function parseRoutineDays(body) {
  const days = {};
  const lines = body.split('\n');
  let currentDay = null;
  for (const line of lines) {
    const dayMatch = line.match(/^## (.+)$/);
    if (dayMatch) {
      currentDay = dayMatch[1].trim().toLowerCase();
      continue;
    }
    if (currentDay && line.trim()) {
      days[currentDay] = line.trim();
      currentDay = null;
    }
  }
  return days;
}

/**
 * Fetch ALL open issues from the repo. Parse each issue body's frontmatter.
 * Returns { recipes: [...], routines: [...] }
 */
export async function fetchAllIssues() {
  try {
    const url = `${API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues?state=open&per_page=100&_=${Date.now()}`;
    const response = await fetch(url, { headers: headers() });

    if (!response.ok) {
      console.error('GitHub API error:', response.status, response.statusText);
      return { recipes: [], routines: [] };
    }

    const issues = await response.json();
    const recipes = [];
    const routines = [];

    for (const issue of issues) {
      if (!issue.body) continue;

      const { meta, body } = parseFrontmatter(issue.body);

      if (meta.type === 'recipe') {
        recipes.push({
          issueNumber: issue.number,
          title: issue.title,
          category: meta.category || '',
          servings: meta.servings || '',
          prepTime: meta.prepTime || '',
          image: meta.image || '',
          body,
          slug: slugify(issue.title),
        });
      } else if (meta.type === 'routine') {
        routines.push({
          issueNumber: issue.number,
          title: issue.title,
          body,
          meta,
          days: parseRoutineDays(body),
        });
      }
    }

    return { recipes, routines };
  } catch (err) {
    console.error('Failed to fetch issues:', err);
    return { recipes: [], routines: [] };
  }
}

/**
 * Create a new issue. Requires PAT.
 */
export async function createIssue(title, body) {
  const url = `${API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create issue: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Update an issue's body. Requires PAT.
 */
export async function updateIssue(issueNumber, body, title) {
  const url = `${API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issueNumber}`;
  const payload = { body };
  if (title) payload.title = title;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to update issue: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Close an issue (used as "delete" since the app only fetches open issues).
 */
export async function closeIssue(issueNumber) {
  const url = `${API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issueNumber}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: 'closed' }),
  });

  if (!response.ok) {
    throw new Error(`Failed to close issue: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
