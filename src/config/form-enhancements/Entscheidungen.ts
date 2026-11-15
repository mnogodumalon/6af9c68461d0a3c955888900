// Auto-generated. Per-entity form-enhancements config for "Entscheidungen".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["frage", "vorhaben", {"row": ["entscheider", "entscheidungsdatum"], "cols": "2fr 1fr"}, "ergebnis", "finanzielle_auswirkung", "freigabe_noetig", "aufgabe", "begruendung", "bedingungen"],
  defaults: {
    'entscheidungsdatum': { kind: 'today' },
  },
  computed: {},
  numberFields: {
    'finanzielle_auswirkung': { allowNegative: true },
  },
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
