import { ref, computed } from 'vue';

export const GITHUB_OWNER = 'tipsy';
export const GITHUB_REPO = 'oppskrifter';

const storedToken = localStorage.getItem('auth_token') || '';
// Clean up old key
localStorage.removeItem('github_pat');

function parseToken(combined) {
  const idx = combined.indexOf('|');
  if (idx <= 0 || idx === combined.length - 1) return { ghPat: '', cloudToken: '' };
  return { ghPat: combined.slice(0, idx).trim(), cloudToken: combined.slice(idx + 1).trim() };
}

const { ghPat, cloudToken } = parseToken(storedToken);

export const githubPat = ref(ghPat);
export const cloudinaryToken = ref(cloudToken);

export const isAuthenticated = computed(() => !!githubPat.value && !!cloudinaryToken.value);

export function setAuthToken(combined) {
  const { ghPat, cloudToken } = parseToken(combined);
  if (!ghPat || !cloudToken) return false;
  localStorage.setItem('auth_token', combined);
  githubPat.value = ghPat;
  cloudinaryToken.value = cloudToken;
  return true;
}
