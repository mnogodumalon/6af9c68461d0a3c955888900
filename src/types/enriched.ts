import type { Angebotsvarianten, Angebotsvorhaben, Aufgaben, Entscheidungen } from './app';

export type EnrichedAngebotsvorhaben = Angebotsvorhaben & {
  projektleitungName: string;
};

export type EnrichedAngebotsvarianten = Angebotsvarianten & {
  vorhabenName: string;
};

export type EnrichedAufgaben = Aufgaben & {
  vorhabenName: string;
  verantwortlicherName: string;
  ausloesende_aufgabeName: string;
};

export type EnrichedEntscheidungen = Entscheidungen & {
  vorhabenName: string;
  entscheiderName: string;
  aufgabeName: string;
};
