import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Beteiligte {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    entscheidungsgrenze?: number;
    vorname?: string;
    nachname?: string;
    email?: string;
    rolle?: string;
    telefon?: string;
    fachbereich?: LookupValue;
    aktiv?: boolean;
  };
}

export interface Angebotsvorhaben {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    bezeichnung?: string;
    kundenname?: string;
    anfragenummer?: string;
    eingangsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    abgabefrist?: string; // Format: YYYY-MM-DD oder ISO String
    anfragebeschreibung?: string;
    liefergegenstand?: string;
    phase?: LookupValue;
    prioritaet?: LookupValue;
    auftragsvolumen?: number;
    projektleitung?: RecordUrl; // applookup -> URL zu 'Beteiligte' Record
    besonderheiten?: string;
  };
}

export interface Angebotsvarianten {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    angebotspreis?: number;
    akzeptierte_risiken?: string;
    vertragsbedingungen?: string;
    status?: LookupValue;
    herstellkosten?: number;
    beschaffungskosten?: number;
    aufwand_stunden?: number;
    vorhaben?: RecordUrl; // applookup -> URL zu 'Angebotsvorhaben' Record
    variantenbezeichnung?: string;
    beschreibung?: string;
    menge?: number;
    teillieferung?: boolean;
    liefertermin?: string; // Format: YYYY-MM-DD oder ISO String
  };
}

export interface Aufgaben {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    titel?: string;
    vorhaben?: RecordUrl; // applookup -> URL zu 'Angebotsvorhaben' Record
    art?: LookupValue;
    verantwortlicher?: RecordUrl; // applookup -> URL zu 'Beteiligte' Record
    faelligkeit?: string; // Format: YYYY-MM-DD oder ISO String
    status?: LookupValue;
    ausloeser?: LookupValue;
    fragestellung?: string;
    ergebnis?: string;
    folgeaufgabe_noetig?: boolean;
    folgeaufgabe_hinweis?: string;
    ausloesende_aufgabe?: RecordUrl; // applookup -> URL zu 'Aufgaben' Record
  };
}

export interface Entscheidungen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    vorhaben?: RecordUrl; // applookup -> URL zu 'Angebotsvorhaben' Record
    frage?: string;
    ergebnis?: LookupValue;
    begruendung?: string;
    bedingungen?: string;
    finanzielle_auswirkung?: number;
    entscheider?: RecordUrl; // applookup -> URL zu 'Beteiligte' Record
    entscheidungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    freigabe_noetig?: boolean;
    aufgabe?: RecordUrl; // applookup -> URL zu 'Aufgaben' Record
  };
}

export const APP_IDS = {
  BETEILIGTE: '6af9c65deb7e80ebf1c9e8dd',
  ANGEBOTSVORHABEN: '6af9c6623da9deca30ddb71c',
  ANGEBOTSVARIANTEN: '6af9c663254ee009281b58ce',
  AUFGABEN: '6af9c66423d64594313d3ada',
  ENTSCHEIDUNGEN: '6af9c6643d66392ac76e9866',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'beteiligte': {
    fachbereich: [{ key: "vertrieb", get label() { return lookupLabel('beteiligte', 'fachbereich', "vertrieb") ?? "Vertrieb"; } }, { key: "konstruktion", get label() { return lookupLabel('beteiligte', 'fachbereich', "konstruktion") ?? "Konstruktion"; } }, { key: "einkauf", get label() { return lookupLabel('beteiligte', 'fachbereich', "einkauf") ?? "Einkauf"; } }, { key: "fertigung", get label() { return lookupLabel('beteiligte', 'fachbereich', "fertigung") ?? "Fertigung"; } }, { key: "ressourcenplanung", get label() { return lookupLabel('beteiligte', 'fachbereich', "ressourcenplanung") ?? "Ressourcenplanung"; } }, { key: "qualitaet", get label() { return lookupLabel('beteiligte', 'fachbereich', "qualitaet") ?? "Qualität"; } }, { key: "recht", get label() { return lookupLabel('beteiligte', 'fachbereich', "recht") ?? "Recht"; } }, { key: "geschaeftsleitung", get label() { return lookupLabel('beteiligte', 'fachbereich', "geschaeftsleitung") ?? "Geschäftsleitung"; } }],
  },
  'angebotsvorhaben': {
    phase: [{ key: "anfragepruefung", get label() { return lookupLabel('angebotsvorhaben', 'phase', "anfragepruefung") ?? "Anfrageprüfung"; } }, { key: "klaerung_lieferumfang", get label() { return lookupLabel('angebotsvorhaben', 'phase', "klaerung_lieferumfang") ?? "Klärung Lieferumfang"; } }, { key: "machbarkeit", get label() { return lookupLabel('angebotsvorhaben', 'phase', "machbarkeit") ?? "Machbarkeit"; } }, { key: "beschaffung", get label() { return lookupLabel('angebotsvorhaben', 'phase', "beschaffung") ?? "Beschaffung"; } }, { key: "ressourcen", get label() { return lookupLabel('angebotsvorhaben', 'phase', "ressourcen") ?? "Ressourcen"; } }, { key: "kalkulation", get label() { return lookupLabel('angebotsvorhaben', 'phase', "kalkulation") ?? "Kalkulation"; } }, { key: "risikobewertung", get label() { return lookupLabel('angebotsvorhaben', 'phase', "risikobewertung") ?? "Risikobewertung"; } }, { key: "variantenentscheidung", get label() { return lookupLabel('angebotsvorhaben', 'phase', "variantenentscheidung") ?? "Variantenentscheidung"; } }, { key: "angebot_abgegeben", get label() { return lookupLabel('angebotsvorhaben', 'phase', "angebot_abgegeben") ?? "Angebot abgegeben"; } }, { key: "abgebrochen", get label() { return lookupLabel('angebotsvorhaben', 'phase', "abgebrochen") ?? "Abgebrochen"; } }],
    prioritaet: [{ key: "niedrig", get label() { return lookupLabel('angebotsvorhaben', 'prioritaet', "niedrig") ?? "Niedrig"; } }, { key: "normal", get label() { return lookupLabel('angebotsvorhaben', 'prioritaet', "normal") ?? "Normal"; } }, { key: "hoch", get label() { return lookupLabel('angebotsvorhaben', 'prioritaet', "hoch") ?? "Hoch"; } }],
  },
  'angebotsvarianten': {
    status: [{ key: "entwurf", get label() { return lookupLabel('angebotsvarianten', 'status', "entwurf") ?? "Entwurf"; } }, { key: "intern_freigegeben", get label() { return lookupLabel('angebotsvarianten', 'status', "intern_freigegeben") ?? "Intern freigegeben"; } }, { key: "vorgelegt", get label() { return lookupLabel('angebotsvarianten', 'status', "vorgelegt") ?? "Dem Kunden vorgelegt"; } }, { key: "verworfen", get label() { return lookupLabel('angebotsvarianten', 'status', "verworfen") ?? "Verworfen"; } }],
  },
  'aufgaben': {
    art: [{ key: "pruefentscheidung", get label() { return lookupLabel('aufgaben', 'art', "pruefentscheidung") ?? "Prüfentscheidung"; } }, { key: "lieferumfang", get label() { return lookupLabel('aufgaben', 'art', "lieferumfang") ?? "Lieferumfang"; } }, { key: "machbarkeit", get label() { return lookupLabel('aufgaben', 'art', "machbarkeit") ?? "Technische Machbarkeit"; } }, { key: "herstellung_beschaffung", get label() { return lookupLabel('aufgaben', 'art', "herstellung_beschaffung") ?? "Herstellung oder Beschaffung"; } }, { key: "ressourcen", get label() { return lookupLabel('aufgaben', 'art', "ressourcen") ?? "Ressourcenverfügbarkeit"; } }, { key: "kosten", get label() { return lookupLabel('aufgaben', 'art', "kosten") ?? "Mengen, Aufwand und Kosten"; } }, { key: "risiken", get label() { return lookupLabel('aufgaben', 'art', "risiken") ?? "Risiken und Verpflichtungen"; } }, { key: "variantenwahl", get label() { return lookupLabel('aufgaben', 'art', "variantenwahl") ?? "Variantenwahl"; } }, { key: "sonstiges", get label() { return lookupLabel('aufgaben', 'art', "sonstiges") ?? "Sonstiges"; } }],
    status: [{ key: "geplant", get label() { return lookupLabel('aufgaben', 'status', "geplant") ?? "Geplant"; } }, { key: "aktiv", get label() { return lookupLabel('aufgaben', 'status', "aktiv") ?? "Aktiv"; } }, { key: "wartet", get label() { return lookupLabel('aufgaben', 'status', "wartet") ?? "Wartet auf Antwort"; } }, { key: "erledigt", get label() { return lookupLabel('aufgaben', 'status', "erledigt") ?? "Erledigt"; } }, { key: "entfallen", get label() { return lookupLabel('aufgaben', 'status', "entfallen") ?? "Entfallen"; } }],
    ausloeser: [{ key: "vorgabe", get label() { return lookupLabel('aufgaben', 'ausloeser', "vorgabe") ?? "Vorgabe"; } }, { key: "folge", get label() { return lookupLabel('aufgaben', 'ausloeser', "folge") ?? "Ergebnis einer anderen Aufgabe"; } }, { key: "spontan", get label() { return lookupLabel('aufgaben', 'ausloeser', "spontan") ?? "Spontan ergänzt"; } }],
  },
  'entscheidungen': {
    ergebnis: [{ key: "ja", get label() { return lookupLabel('entscheidungen', 'ergebnis', "ja") ?? "Ja"; } }, { key: "nein", get label() { return lookupLabel('entscheidungen', 'ergebnis', "nein") ?? "Nein"; } }, { key: "bedingt", get label() { return lookupLabel('entscheidungen', 'ergebnis', "bedingt") ?? "Bedingt"; } }, { key: "vertagt", get label() { return lookupLabel('entscheidungen', 'ergebnis', "vertagt") ?? "Vertagt"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'beteiligte': {
    'entscheidungsgrenze': 'number',
    'vorname': 'string/text',
    'nachname': 'string/text',
    'email': 'string/email',
    'rolle': 'string/text',
    'telefon': 'string/tel',
    'fachbereich': 'lookup/select',
    'aktiv': 'bool',
  },
  'angebotsvorhaben': {
    'bezeichnung': 'string/text',
    'kundenname': 'string/text',
    'anfragenummer': 'string/text',
    'eingangsdatum': 'date/date',
    'abgabefrist': 'date/date',
    'anfragebeschreibung': 'string/textarea',
    'liefergegenstand': 'string/textarea',
    'phase': 'lookup/select',
    'prioritaet': 'lookup/radio',
    'auftragsvolumen': 'number',
    'projektleitung': 'applookup/select',
    'besonderheiten': 'string/textarea',
  },
  'angebotsvarianten': {
    'angebotspreis': 'number',
    'akzeptierte_risiken': 'string/textarea',
    'vertragsbedingungen': 'string/textarea',
    'status': 'lookup/select',
    'herstellkosten': 'number',
    'beschaffungskosten': 'number',
    'aufwand_stunden': 'number',
    'vorhaben': 'applookup/select',
    'variantenbezeichnung': 'string/text',
    'beschreibung': 'string/textarea',
    'menge': 'number',
    'teillieferung': 'bool',
    'liefertermin': 'date/date',
  },
  'aufgaben': {
    'titel': 'string/text',
    'vorhaben': 'applookup/select',
    'art': 'lookup/select',
    'verantwortlicher': 'applookup/select',
    'faelligkeit': 'date/date',
    'status': 'lookup/select',
    'ausloeser': 'lookup/radio',
    'fragestellung': 'string/textarea',
    'ergebnis': 'string/textarea',
    'folgeaufgabe_noetig': 'bool',
    'folgeaufgabe_hinweis': 'string/textarea',
    'ausloesende_aufgabe': 'applookup/select',
  },
  'entscheidungen': {
    'vorhaben': 'applookup/select',
    'frage': 'string/text',
    'ergebnis': 'lookup/radio',
    'begruendung': 'string/textarea',
    'bedingungen': 'string/textarea',
    'finanzielle_auswirkung': 'number',
    'entscheider': 'applookup/select',
    'entscheidungsdatum': 'date/date',
    'freigabe_noetig': 'bool',
    'aufgabe': 'applookup/select',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
  'beteiligte': [
    { field: 'projektleitung', entity: 'angebotsvorhaben' },
    { field: 'verantwortlicher', entity: 'aufgaben' },
    { field: 'entscheider', entity: 'entscheidungen' },
  ],
  'angebotsvorhaben': [
    { field: 'vorhaben', entity: 'angebotsvarianten' },
    { field: 'vorhaben', entity: 'aufgaben' },
    { field: 'vorhaben', entity: 'entscheidungen' },
  ],
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateBeteiligte = StripLookup<Beteiligte['fields']>;
export type CreateAngebotsvorhaben = StripLookup<Angebotsvorhaben['fields']>;
export type CreateAngebotsvarianten = StripLookup<Angebotsvarianten['fields']>;
export type CreateAufgaben = StripLookup<Aufgaben['fields']>;
export type CreateEntscheidungen = StripLookup<Entscheidungen['fields']>;