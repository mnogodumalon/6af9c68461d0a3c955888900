import type { Abhaengigkeiten, Anforderungen, Angebotsuebernahmen, Angebotsvarianten, Angebotsvorhaben, Aufgaben, Entscheidungen, Fachbeitraege } from './app';

export type EnrichedAnforderungen = Anforderungen & {
  vorhabenName: string;
  vorgaengerversionName: string;
};

export type EnrichedFachbeitraege = Fachbeitraege & {
  vorhabenName: string;
  aufgabeName: string;
  autorName: string;
  anforderungName: string;
  varianteName: string;
};

export type EnrichedAngebotsvorhaben = Angebotsvorhaben & {
  projektleitungName: string;
};

export type EnrichedAngebotsvarianten = Angebotsvarianten & {
  vorgaengerversionName: string;
  vorhabenName: string;
};

export type EnrichedAbhaengigkeiten = Abhaengigkeiten & {
  vorhabenName: string;
  abhaengige_aufgabeName: string;
  grundlage_varianteName: string;
  grundlage_aufgabeName: string;
  grundlage_anforderungName: string;
  grundlage_beitragName: string;
};

export type EnrichedAufgaben = Aufgaben & {
  vorhabenName: string;
  verantwortlicherName: string;
  ausloesende_aufgabeName: string;
};

export type EnrichedAngebotsuebernahmen = Angebotsuebernahmen & {
  anforderungName: string;
  beitragName: string;
  vorhabenName: string;
  varianteName: string;
  entscheidungName: string;
  uebernommen_vonName: string;
};

export type EnrichedEntscheidungen = Entscheidungen & {
  varianteName: string;
  freigeberName: string;
  vorhabenName: string;
  entscheiderName: string;
  aufgabeName: string;
};
