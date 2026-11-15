import type { EnrichedAngebotsvarianten, EnrichedAngebotsvorhaben, EnrichedAufgaben, EnrichedEntscheidungen } from '@/types/enriched';
import type { Angebotsvarianten, Angebotsvorhaben, Aufgaben, Beteiligte, Entscheidungen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import { displayPart } from '@/lib/journey/rules';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => displayPart(r.fields[f])).filter(Boolean).join(' ').trim();
}

interface AngebotsvorhabenMaps {
  beteiligteMap: Map<string, Beteiligte>;
}

export function enrichAngebotsvorhaben(
  angebotsvorhaben: Angebotsvorhaben[],
  maps: AngebotsvorhabenMaps
): EnrichedAngebotsvorhaben[] {
  return angebotsvorhaben.map(r => ({
    ...r,
    projektleitungName: resolveDisplay(r.fields.projektleitung, maps.beteiligteMap, 'vorname', 'nachname'),
  }));
}

interface AngebotsvariantenMaps {
  angebotsvorhabenMap: Map<string, Angebotsvorhaben>;
}

export function enrichAngebotsvarianten(
  angebotsvarianten: Angebotsvarianten[],
  maps: AngebotsvariantenMaps
): EnrichedAngebotsvarianten[] {
  return angebotsvarianten.map(r => ({
    ...r,
    vorhabenName: resolveDisplay(r.fields.vorhaben, maps.angebotsvorhabenMap, 'bezeichnung'),
  }));
}

interface AufgabenMaps {
  angebotsvorhabenMap: Map<string, Angebotsvorhaben>;
  beteiligteMap: Map<string, Beteiligte>;
  aufgabenMap: Map<string, Aufgaben>;
}

export function enrichAufgaben(
  aufgaben: Aufgaben[],
  maps: AufgabenMaps
): EnrichedAufgaben[] {
  return aufgaben.map(r => ({
    ...r,
    vorhabenName: resolveDisplay(r.fields.vorhaben, maps.angebotsvorhabenMap, 'bezeichnung'),
    verantwortlicherName: resolveDisplay(r.fields.verantwortlicher, maps.beteiligteMap, 'vorname', 'nachname'),
    ausloesende_aufgabeName: resolveDisplay(r.fields.ausloesende_aufgabe, maps.aufgabenMap, 'titel'),
  }));
}

interface EntscheidungenMaps {
  angebotsvorhabenMap: Map<string, Angebotsvorhaben>;
  beteiligteMap: Map<string, Beteiligte>;
  aufgabenMap: Map<string, Aufgaben>;
}

export function enrichEntscheidungen(
  entscheidungen: Entscheidungen[],
  maps: EntscheidungenMaps
): EnrichedEntscheidungen[] {
  return entscheidungen.map(r => ({
    ...r,
    vorhabenName: resolveDisplay(r.fields.vorhaben, maps.angebotsvorhabenMap, 'bezeichnung'),
    entscheiderName: resolveDisplay(r.fields.entscheider, maps.beteiligteMap, 'vorname', 'nachname'),
    aufgabeName: resolveDisplay(r.fields.aufgabe, maps.aufgabenMap, 'titel'),
  }));
}
