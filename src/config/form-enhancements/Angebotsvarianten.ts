// Auto-generated. Per-entity form-enhancements config for "Angebotsvarianten".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["variantenbezeichnung", "vorhaben", "status", {"row": ["menge", "liefertermin"], "cols": "1fr 1fr"}, "teillieferung", {"row": ["herstellkosten", "beschaffungskosten"], "cols": "1fr 1fr"}, {"row": ["aufwand_stunden", "angebotspreis"], "cols": "1fr 1fr"}, "beschreibung", "akzeptierte_risiken", "vertragsbedingungen"],
  defaults: {
    'status': { kind: 'lookup', key: 'entwurf', label: 'Entwurf' },
    'menge': { kind: 'literal', value: 1 },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
