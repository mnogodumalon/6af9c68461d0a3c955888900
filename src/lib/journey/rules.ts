/**
 * Field rules — GENERATED from the app metadata. Do not edit.
 *
 * The mechanical truth about every field: what kind it is, whether the
 * platform's base view marks it required, which lookup keys exist, where an
 * applookup points, what the label is. `useStepForm` validates against these
 * rules and phrases its messages with the real labels; `toWirePayload` uses
 * them to shape the create payload; `SHAPES` tells a page which input FORM
 * fits the data (a date pair wants a calendar, not two fields) — it is a
 * signal, not a gate.
 */
import { appLabel, fieldLabel, lookupLabel } from '@/i18n';
import { formatDate, formatDateTime } from '@/lib/formatters';
import { policyLabel } from './policy';
import { LOOKUP_OPTIONS } from '@/types/app';

export type EntityKey = 'beteiligte' | 'angebotsvorhaben' | 'angebotsvarianten' | 'aufgaben' | 'entscheidungen';

/** The text fields of each entity — what a search may run over (generated;
 *  `never` for an entity without text of its own, e.g. a link table). */
export interface StringFields {
  "beteiligte": "vorname" | "nachname" | "email" | "rolle" | "telefon";
  "angebotsvorhaben": "bezeichnung" | "kundenname" | "anfragenummer" | "anfragebeschreibung" | "liefergegenstand" | "besonderheiten";
  "angebotsvarianten": "akzeptierte_risiken" | "vertragsbedingungen" | "variantenbezeichnung" | "beschreibung";
  "aufgaben": "titel" | "fragestellung" | "ergebnis" | "folgeaufgabe_hinweis";
  "entscheidungen": "frage" | "begruendung" | "bedingungen";
}
export type StringFieldKey<E extends EntityKey> = E extends keyof StringFields ? StringFields[E] : never;

/** The applookup fields of each entity (generated). A pick stored through
 *  `form.set` on one of these must carry its display name — at compile time
 *  (`StepForm.set`), because the review would otherwise show the id. */
export interface RecordFields {
  "beteiligte": never;
  "angebotsvorhaben": "projektleitung";
  "angebotsvarianten": "vorhaben";
  "aufgaben": "vorhaben" | "verantwortlicher" | "ausloesende_aufgabe";
  "entscheidungen": "vorhaben" | "entscheider" | "aufgabe";
}
export type RecordFieldKey<E extends EntityKey> = E extends keyof RecordFields ? RecordFields[E] : never;

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'url'
  | 'number'
  | 'bool'
  | 'date'
  | 'datetime'
  | 'lookup'
  | 'multilookup'
  | 'record'
  | 'multirecord'
  | 'file'
  | 'geo';

export interface FieldRule {
  key: string;
  fulltype: string;
  kind: FieldKind;
  /** From the app's base view. A public page may override this per field. */
  required: boolean;
  /** Build-time label — `labelOf()` prefers the runtime i18n bundle. */
  label: string;
  /** Whether a journey may write it as a value. `file` is false: a file is UPLOADED
   *  (`form.file(key)` → FileField; the chosen file travels in the create as a data URL). */
  writable: boolean;
  maxLength?: number;
  /** lookup / multilookup: the ONLY valid write values. */
  options?: string[];
  /** record / multirecord: the target app (always) and its entity key (when inside this appgroup). */
  targetAppId?: string;
  targetEntity?: EntityKey;
  format?: 'currency';
  /** HTML autocomplete token derived from the field name (given-name, email, tel, …). */
  autoComplete?: string;
}

export interface EntityInfo {
  key: EntityKey;
  appId: string;
  label: string;
  /** PascalCase plural — `get<pascal>()` on the service. */
  pascal: string;
  /** The single-record suffix — `create<single>()` on the service. */
  single: string;
}

/** Input-form signals per entity: which data shape each field (pair) has.
 *  `range`  — two date fields that form a stay/period → AvailabilityRangePicker
 *  `choice` — a lookup with few options → ChoiceGroup pills instead of a select
 *  `record` — an applookup → EntitySelectStep with search, never a raw id field
 *  `stock`  — a quantity that has a stock/capacity counterpart → show it, warn on overshoot */
export type Shape =
  | { kind: 'range'; from: string; to: string }
  | { kind: 'choice'; field: string; count: number }
  | { kind: 'record'; field: string; targetEntity?: EntityKey }
  | { kind: 'stock'; field: string };

export const ENTITIES: Record<EntityKey, EntityInfo> = {
  "beteiligte": {
    "key": "beteiligte",
    "appId": "6af9c65deb7e80ebf1c9e8dd",
    "label": "Beteiligte",
    "pascal": "Beteiligte",
    "single": "BeteiligteEntry"
  },
  "angebotsvorhaben": {
    "key": "angebotsvorhaben",
    "appId": "6af9c6623da9deca30ddb71c",
    "label": "Angebotsvorhaben",
    "pascal": "Angebotsvorhaben",
    "single": "AngebotsvorhabenEntry"
  },
  "angebotsvarianten": {
    "key": "angebotsvarianten",
    "appId": "6af9c663254ee009281b58ce",
    "label": "Angebotsvarianten",
    "pascal": "Angebotsvarianten",
    "single": "AngebotsvariantenEntry"
  },
  "aufgaben": {
    "key": "aufgaben",
    "appId": "6af9c66423d64594313d3ada",
    "label": "Aufgaben",
    "pascal": "Aufgaben",
    "single": "AufgabenEntry"
  },
  "entscheidungen": {
    "key": "entscheidungen",
    "appId": "6af9c6643d66392ac76e9866",
    "label": "Entscheidungen",
    "pascal": "Entscheidungen",
    "single": "EntscheidungenEntry"
  }
};

export const FIELD_RULES: Record<EntityKey, Record<string, FieldRule>> = {
  "beteiligte": {
    "entscheidungsgrenze": {
      "key": "entscheidungsgrenze",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Entscheidungsgrenze in Euro",
      "writable": true,
      "format": "currency"
    },
    "vorname": {
      "key": "vorname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Vorname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "given-name"
    },
    "nachname": {
      "key": "nachname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Nachname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "family-name"
    },
    "email": {
      "key": "email",
      "fulltype": "string/email",
      "kind": "email",
      "required": false,
      "label": "E-Mail",
      "writable": true,
      "autoComplete": "email"
    },
    "rolle": {
      "key": "rolle",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Rolle",
      "writable": true,
      "maxLength": 4000
    },
    "telefon": {
      "key": "telefon",
      "fulltype": "string/tel",
      "kind": "tel",
      "required": false,
      "label": "Telefon",
      "writable": true,
      "autoComplete": "tel"
    },
    "fachbereich": {
      "key": "fachbereich",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Fachbereich",
      "writable": true,
      "options": [
        "vertrieb",
        "konstruktion",
        "einkauf",
        "fertigung",
        "ressourcenplanung",
        "qualitaet",
        "recht",
        "geschaeftsleitung"
      ]
    },
    "aktiv": {
      "key": "aktiv",
      "fulltype": "bool",
      "kind": "bool",
      "required": false,
      "label": "Aktiv",
      "writable": true
    }
  },
  "angebotsvorhaben": {
    "bezeichnung": {
      "key": "bezeichnung",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Vorhabenbezeichnung",
      "writable": true,
      "maxLength": 4000
    },
    "kundenname": {
      "key": "kundenname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Kunde",
      "writable": true,
      "maxLength": 4000
    },
    "anfragenummer": {
      "key": "anfragenummer",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Anfragenummer",
      "writable": true,
      "maxLength": 4000
    },
    "eingangsdatum": {
      "key": "eingangsdatum",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Eingangsdatum",
      "writable": true
    },
    "abgabefrist": {
      "key": "abgabefrist",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Abgabefrist",
      "writable": true
    },
    "anfragebeschreibung": {
      "key": "anfragebeschreibung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Kurzbeschreibung der Anfrage",
      "writable": true
    },
    "liefergegenstand": {
      "key": "liefergegenstand",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Liefergegenstand",
      "writable": true
    },
    "phase": {
      "key": "phase",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Phase",
      "writable": true,
      "options": [
        "anfragepruefung",
        "klaerung_lieferumfang",
        "machbarkeit",
        "beschaffung",
        "ressourcen",
        "kalkulation",
        "risikobewertung",
        "variantenentscheidung",
        "angebot_abgegeben",
        "abgebrochen"
      ]
    },
    "prioritaet": {
      "key": "prioritaet",
      "fulltype": "lookup/radio",
      "kind": "lookup",
      "required": false,
      "label": "Priorität",
      "writable": true,
      "options": [
        "niedrig",
        "normal",
        "hoch"
      ]
    },
    "auftragsvolumen": {
      "key": "auftragsvolumen",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Geschätztes Auftragsvolumen in Euro",
      "writable": true,
      "format": "currency"
    },
    "projektleitung": {
      "key": "projektleitung",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": false,
      "label": "Projektleitung",
      "writable": true,
      "targetAppId": "6af9c65deb7e80ebf1c9e8dd",
      "targetEntity": "beteiligte"
    },
    "besonderheiten": {
      "key": "besonderheiten",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Besonderheiten",
      "writable": true
    }
  },
  "angebotsvarianten": {
    "angebotspreis": {
      "key": "angebotspreis",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Angebotspreis in Euro",
      "writable": true,
      "format": "currency"
    },
    "akzeptierte_risiken": {
      "key": "akzeptierte_risiken",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Akzeptierte Risiken",
      "writable": true
    },
    "vertragsbedingungen": {
      "key": "vertragsbedingungen",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Vertragsbedingungen",
      "writable": true
    },
    "status": {
      "key": "status",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Status",
      "writable": true,
      "options": [
        "entwurf",
        "intern_freigegeben",
        "vorgelegt",
        "verworfen"
      ]
    },
    "herstellkosten": {
      "key": "herstellkosten",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Herstellkosten in Euro",
      "writable": true,
      "format": "currency"
    },
    "beschaffungskosten": {
      "key": "beschaffungskosten",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Beschaffungskosten in Euro",
      "writable": true,
      "format": "currency"
    },
    "aufwand_stunden": {
      "key": "aufwand_stunden",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Aufwand in Stunden",
      "writable": true
    },
    "vorhaben": {
      "key": "vorhaben",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Angebotsvorhaben",
      "writable": true,
      "targetAppId": "6af9c6623da9deca30ddb71c",
      "targetEntity": "angebotsvorhaben"
    },
    "variantenbezeichnung": {
      "key": "variantenbezeichnung",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Variantenbezeichnung",
      "writable": true,
      "maxLength": 4000
    },
    "beschreibung": {
      "key": "beschreibung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Beschreibung",
      "writable": true
    },
    "menge": {
      "key": "menge",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Menge",
      "writable": true
    },
    "teillieferung": {
      "key": "teillieferung",
      "fulltype": "bool",
      "kind": "bool",
      "required": false,
      "label": "Teillieferung",
      "writable": true
    },
    "liefertermin": {
      "key": "liefertermin",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Liefertermin",
      "writable": true
    }
  },
  "aufgaben": {
    "titel": {
      "key": "titel",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Titel",
      "writable": true,
      "maxLength": 4000
    },
    "vorhaben": {
      "key": "vorhaben",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Angebotsvorhaben",
      "writable": true,
      "targetAppId": "6af9c6623da9deca30ddb71c",
      "targetEntity": "angebotsvorhaben"
    },
    "art": {
      "key": "art",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Art der Untersuchung",
      "writable": true,
      "options": [
        "pruefentscheidung",
        "lieferumfang",
        "machbarkeit",
        "herstellung_beschaffung",
        "ressourcen",
        "kosten",
        "risiken",
        "variantenwahl",
        "sonstiges"
      ]
    },
    "verantwortlicher": {
      "key": "verantwortlicher",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": false,
      "label": "Verantwortlicher",
      "writable": true,
      "targetAppId": "6af9c65deb7e80ebf1c9e8dd",
      "targetEntity": "beteiligte"
    },
    "faelligkeit": {
      "key": "faelligkeit",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Fälligkeit",
      "writable": true
    },
    "status": {
      "key": "status",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Status",
      "writable": true,
      "options": [
        "geplant",
        "aktiv",
        "wartet",
        "erledigt",
        "entfallen"
      ]
    },
    "ausloeser": {
      "key": "ausloeser",
      "fulltype": "lookup/radio",
      "kind": "lookup",
      "required": false,
      "label": "Auslöser",
      "writable": true,
      "options": [
        "vorgabe",
        "folge",
        "spontan"
      ]
    },
    "fragestellung": {
      "key": "fragestellung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Fragestellung",
      "writable": true
    },
    "ergebnis": {
      "key": "ergebnis",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Antwort oder Ergebnis",
      "writable": true
    },
    "folgeaufgabe_noetig": {
      "key": "folgeaufgabe_noetig",
      "fulltype": "bool",
      "kind": "bool",
      "required": false,
      "label": "Folgeaufgabe erforderlich",
      "writable": true
    },
    "folgeaufgabe_hinweis": {
      "key": "folgeaufgabe_hinweis",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Hinweis zur Folgeaufgabe",
      "writable": true
    },
    "ausloesende_aufgabe": {
      "key": "ausloesende_aufgabe",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": false,
      "label": "Auslösende Aufgabe",
      "writable": true,
      "targetAppId": "6af9c66423d64594313d3ada",
      "targetEntity": "aufgaben"
    }
  },
  "entscheidungen": {
    "vorhaben": {
      "key": "vorhaben",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Angebotsvorhaben",
      "writable": true,
      "targetAppId": "6af9c6623da9deca30ddb71c",
      "targetEntity": "angebotsvorhaben"
    },
    "frage": {
      "key": "frage",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Entscheidungsfrage",
      "writable": true,
      "maxLength": 4000
    },
    "ergebnis": {
      "key": "ergebnis",
      "fulltype": "lookup/radio",
      "kind": "lookup",
      "required": true,
      "label": "Ergebnis",
      "writable": true,
      "options": [
        "ja",
        "nein",
        "bedingt",
        "vertagt"
      ]
    },
    "begruendung": {
      "key": "begruendung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Begründung",
      "writable": true
    },
    "bedingungen": {
      "key": "bedingungen",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Bedingungen",
      "writable": true
    },
    "finanzielle_auswirkung": {
      "key": "finanzielle_auswirkung",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Finanzielle Auswirkung in Euro",
      "writable": true,
      "format": "currency"
    },
    "entscheider": {
      "key": "entscheider",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Entscheider",
      "writable": true,
      "targetAppId": "6af9c65deb7e80ebf1c9e8dd",
      "targetEntity": "beteiligte"
    },
    "entscheidungsdatum": {
      "key": "entscheidungsdatum",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Entscheidungsdatum",
      "writable": true
    },
    "freigabe_noetig": {
      "key": "freigabe_noetig",
      "fulltype": "bool",
      "kind": "bool",
      "required": false,
      "label": "Freigabe durch höhere Ebene erforderlich",
      "writable": true
    },
    "aufgabe": {
      "key": "aufgabe",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": false,
      "label": "Zugehörige Aufgabe",
      "writable": true,
      "targetAppId": "6af9c66423d64594313d3ada",
      "targetEntity": "aufgaben"
    }
  }
};

export const SHAPES: Record<EntityKey, Shape[]> = {
  "beteiligte": [],
  "angebotsvorhaben": [
    {
      "kind": "choice",
      "field": "prioritaet",
      "count": 3
    },
    {
      "kind": "record",
      "field": "projektleitung",
      "targetEntity": "beteiligte"
    }
  ],
  "angebotsvarianten": [
    {
      "kind": "choice",
      "field": "status",
      "count": 4
    },
    {
      "kind": "record",
      "field": "vorhaben",
      "targetEntity": "angebotsvorhaben"
    }
  ],
  "aufgaben": [
    {
      "kind": "choice",
      "field": "status",
      "count": 5
    },
    {
      "kind": "choice",
      "field": "ausloeser",
      "count": 3
    },
    {
      "kind": "record",
      "field": "vorhaben",
      "targetEntity": "angebotsvorhaben"
    },
    {
      "kind": "record",
      "field": "verantwortlicher",
      "targetEntity": "beteiligte"
    },
    {
      "kind": "record",
      "field": "ausloesende_aufgabe",
      "targetEntity": "aufgaben"
    }
  ],
  "entscheidungen": [
    {
      "kind": "choice",
      "field": "ergebnis",
      "count": 4
    },
    {
      "kind": "record",
      "field": "vorhaben",
      "targetEntity": "angebotsvorhaben"
    },
    {
      "kind": "record",
      "field": "entscheider",
      "targetEntity": "beteiligte"
    },
    {
      "kind": "record",
      "field": "aufgabe",
      "targetEntity": "aufgaben"
    }
  ]
};

/** The fields a record of this entity is recognised by (a person: first and
 *  last name; else its title-like text field) — the same choice the dashboard's
 *  enrichment makes for `<key>Name`. `useRecordSearch` resolves an applookup to
 *  this name (`ctx.ref('gast')` in `toItem`). */
export const DISPLAY_FIELDS: Record<EntityKey, string[]> = {
  "beteiligte": [
    "vorname",
    "nachname"
  ],
  "angebotsvorhaben": [
    "bezeichnung"
  ],
  "angebotsvarianten": [
    "variantenbezeichnung"
  ],
  "aufgaben": [
    "titel"
  ],
  "entscheidungen": [
    "frage"
  ]
};

/** The display name of a record: its display fields joined, else the first
 *  non-empty text value, else ''. */
/** A display-field value as text: strings as they are, a lookup `{ key, label }`
 *  (either door hydrates lookups to objects) by its label — an entity whose
 *  only title-like field is a lookup/select otherwise had no name at all. */
/** A date reads as a date (a target whose only readable fields are `beginn`/`ende` — Doodle KB 6),
 *  a number as a number; a record URL or a bare id is never a name (0.0.389). */
export function displayPart(v: unknown): string {
  if (typeof v === 'string') {
    const s = v.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return formatDate(s);
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return formatDateTime(s);
    if (/^https?:\/\//.test(s) || /^[0-9a-f]{24}$/i.test(s)) return '';
    return s;
  }
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  if (v && typeof v === 'object' && 'label' in v) {
    const l = (v as { label?: unknown }).label;
    return l === null || l === undefined ? '' : String(l).trim();
  }
  return '';
}

export function displayNameOf(entity: EntityKey, fields: Record<string, unknown>): string {
  const parts = (DISPLAY_FIELDS[entity] ?? [])
    .map(k => displayPart(fields[k]))
    .filter(v => v !== '');
  if (parts.length > 0) return parts.join(' ');
  for (const [k, rule] of Object.entries(FIELD_RULES[entity] ?? {})) {
    if (rule.kind !== 'text' && rule.kind !== 'email') continue;
    const v = fields[k];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return '';
}

export function ruleOf(entity: EntityKey, key: string): FieldRule | undefined {
  return FIELD_RULES[entity]?.[key];
}

/** The field label as the user sees it — the owner's policy label first (a
 *  public page's "Felder anpassen"), runtime bundle second, generated label last. */
export function labelOf(entity: EntityKey, key: string): string {
  const own = policyLabel(entity, key);
  if (own) return own;
  const fromBundle = fieldLabel(entity, key);
  if (fromBundle !== key) return fromBundle;
  return ruleOf(entity, key)?.label ?? key;
}

export function entityLabel(entity: EntityKey): string {
  const fromBundle = appLabel(entity);
  if (fromBundle !== entity) return fromBundle;
  return ENTITIES[entity]?.label ?? entity;
}

/** Lookup options with runtime labels — the only legitimate source of `{key,label}` pairs. */
export function optionsOf(entity: EntityKey, key: string): Array<{ key: string; label: string }> {
  const generated = (LOOKUP_OPTIONS as Record<string, Record<string, Array<{ key: string; label: string }>>>)[entity]?.[key];
  if (generated && generated.length) return generated.map(o => ({ key: o.key, label: o.label }));
  const keys = ruleOf(entity, key)?.options ?? [];
  return keys.map(k => ({ key: k, label: lookupLabel(entity, key, k) ?? k }));
}

/** „Nicht ausgefüllt“ for a required field, by its kind: a checkbox that is
 *  `false` is NOT filled — the person did not consent (live 03.11.2026: a
 *  consent page validated with the box unticked and the grant took it). Every
 *  other kind is isEmptyValue. */
export function isUnfilled(entity: EntityKey, key: string, v: unknown): boolean {
  if (ruleOf(entity, key)?.kind === 'bool') return v !== true;
  return isEmptyValue(v);
}

export function isEmptyValue(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object' && 'from' in (v as object) && 'to' in (v as object)) {
    const r = v as { from: unknown; to: unknown };
    return isEmptyValue(r.from) && isEmptyValue(r.to);
  }
  return false;
}
