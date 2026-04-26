export const CAT_NAMES = [
  'Einer', 'Zweier', 'Dreier', 'Vierer', 'Fünfer', 'Sechser',
  'Drei Gleiche', 'Vier Gleiche', 'Volles Haus',
  'Kleine Strasse', 'Grosse Strasse', 'YATZY', 'Chance',
  '1 Paar', '2 Paar',
];

export const LOWER_ORDER = [13, 14, 6, 7, 9, 10, 8, 12, 11];
export const SCORECARD_KEY_ORDER = [
  ['1', 0], ['2', 1], ['3', 2], ['4', 3], ['5', 4],
  ['6', 5], ['7', 13], ['8', 14], ['9', 6], ['0', 7],
  ['Q', 9], ['W', 10], ['E', 8], ['R', 12], ['T', 11],
];
export const ALL_USED_MASK = (1 << 15) - 1;
export const UPPER_THRESHOLD = 63;
export const UPPER_BONUS = 35;

export const PIPS = {
  1: [[50, 50]],
  2: [[70, 22], [30, 78]],
  3: [[70, 22], [50, 50], [30, 78]],
  4: [[30, 22], [70, 22], [30, 78], [70, 78]],
  5: [[30, 22], [70, 22], [50, 50], [30, 78], [70, 78]],
  6: [[30, 22], [70, 22], [30, 50], [70, 50], [30, 78], [70, 78]],
};
