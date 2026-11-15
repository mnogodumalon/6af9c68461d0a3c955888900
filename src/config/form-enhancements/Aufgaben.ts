// Auto-generated. Per-entity form-enhancements config for "Aufgaben".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["titel", "vorhaben", {"row": ["art", "status"], "cols": "1fr 1fr"}, {"row": ["verantwortlicher", "faelligkeit"], "cols": "1fr 1fr"}, "ausloeser", "ausloesende_aufgabe", "folgeaufgabe_noetig", "fragestellung", "ergebnis", "folgeaufgabe_hinweis"],
  defaults: {
    'status': { kind: 'lookup', key: 'geplant', label: 'Geplant' },
    'faelligkeit': { kind: 'todayOffset', days: 14 },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
