// Fork: matches a tag name against what someone typed into a tag picker. Case, accents
// and punctuation do not matter ("repo" finds R.E.P.O), and initials work too ("lol"
// finds League of Legends).
function normalize(text: string) {
  return text.toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function tagMatches(name: string, query: string) {
  const typed = normalize(query).trim();
  if (!typed) return true;

  const target = normalize(name);
  const letters = (text: string) => text.replace(/[^a-z0-9]/g, '');
  const typedLetters = letters(typed);
  // Names in other scripts have no a-z letters to compare, so they match as written.
  if (!typedLetters) return target.includes(typed);
  if (letters(target).includes(typedLetters)) return true;

  const initials = target
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('');
  return initials.startsWith(typedLetters);
}
