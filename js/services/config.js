import { ref, watch } from 'vue';

export const GITHUB_OWNER = 'tipsy';
export const GITHUB_REPO = 'oppskrifter';
export const pat = ref(localStorage.getItem('github_pat') || '');

watch(pat, (v) => {
  if (v) {
    localStorage.setItem('github_pat', v);
  } else {
    localStorage.removeItem('github_pat');
  }
});
