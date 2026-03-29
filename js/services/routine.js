const DAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];

export function loadRoutine(mdContent) {
  const routine = {};
  for (const day of DAYS) {
    routine[day.toLowerCase()] = '';
  }

  const lines = mdContent.split('\n');
  let currentDay = null;

  for (const line of lines) {
    const trimmed = line.trim();
    // Check for day heading
    const dayMatch = trimmed.match(/^## (.+)$/);
    if (dayMatch) {
      const dayName = dayMatch[1].trim();
      const key = dayName.toLowerCase();
      if (key in routine) {
        currentDay = key;
      }
      continue;
    }
    // If we have a current day and this line has content, it's the slug
    if (currentDay && trimmed && !trimmed.startsWith('---') && !trimmed.startsWith('week:')) {
      routine[currentDay] = trimmed;
      currentDay = null;
    }
  }

  return routine;
}

export function generateRoutineMarkdown(routine) {
  const lines = ['---', 'week: current', '---', ''];
  for (const day of DAYS) {
    const key = day.toLowerCase();
    lines.push(`## ${day}`);
    lines.push(routine[key] || '');
    lines.push('');
  }
  return lines.join('\n');
}

export async function fetchRoutine() {
  try {
    const response = await fetch('routine.md');
    if (!response.ok) return null;
    const text = await response.text();
    return loadRoutine(text);
  } catch {
    return null;
  }
}

export { DAYS };
