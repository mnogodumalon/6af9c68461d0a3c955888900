// Auto-generated. Per-entity form-enhancements config for "Angebotsvorhaben".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["bezeichnung", "kundenname", {"row": ["phase", "prioritaet"], "cols": "1fr 1fr"}, "anfragenummer", {"row": ["eingangsdatum", "abgabefrist"], "cols": "1fr 1fr"}, "projektleitung", "auftragsvolumen", "anfragebeschreibung", "liefergegenstand", "besonderheiten"],
  defaults: {
    'eingangsdatum': { kind: 'today' },
    'abgabefrist': { kind: 'todayOffset', days: 14 },
    'phase': { kind: 'lookup', key: 'anfragepruefung', label: 'Anfrageprüfung' },
    'prioritaet': { kind: 'lookup', key: 'normal', label: 'Normal' },
  },
  computed: {
    '_vorhaben_dauer_tage': { kind: 'dateDiff', from: 'eingangsdatum', to: 'abgabefrist', unit: 'days' },
  },
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
