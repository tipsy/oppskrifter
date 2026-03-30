import { ref, computed } from 'vue';

export const GITHUB_OWNER = 'tipsy';
export const GITHUB_REPO = 'oppskrifter';

function isValidToken(combined) {
  if (!combined) return false;
  const pipeIdx = combined.indexOf('|');
  if (pipeIdx <= 0 || pipeIdx === combined.length - 1) return false;
  const ghPat = combined.slice(0, pipeIdx).trim();
  const cloudPart = combined.slice(pipeIdx + 1).trim();
  if (!ghPat.startsWith('github_pat_')) return false;
  const cloudParts = cloudPart.split(':').map(s => s.trim());
  return cloudParts.length === 3 && cloudParts.every(p => p.length > 0);
}

function parseToken(combined) {
  if (!isValidToken(combined)) return { ghPat: '', cloudToken: '' };
  const pipeIdx = combined.indexOf('|');
  return { ghPat: combined.slice(0, pipeIdx).trim(), cloudToken: combined.slice(pipeIdx + 1).trim() };
}

// Validate stored token on startup
const storedToken = localStorage.getItem('auth_token') || '';
if (storedToken && !isValidToken(storedToken)) {
  localStorage.clear();
}

const { ghPat, cloudToken } = parseToken(localStorage.getItem('auth_token') || '');

export const githubPat = ref(ghPat);
export const cloudinaryToken = ref(cloudToken);

export const isAuthenticated = computed(() => !!githubPat.value && !!cloudinaryToken.value);

export function setAuthToken(combined) {
  if (!isValidToken(combined)) return false;
  localStorage.setItem('auth_token', combined);
  const { ghPat, cloudToken } = parseToken(combined);
  githubPat.value = ghPat;
  cloudinaryToken.value = cloudToken;
  return true;
}
