import type { EnrichedAbhaengigkeiten, EnrichedAnforderungen, EnrichedAngebotsuebernahmen, EnrichedAngebotsvarianten, EnrichedAngebotsvorhaben, EnrichedAufgaben, EnrichedEntscheidungen, EnrichedFachbeitraege } from '@/types/enriched';
import type { Abhaengigkeiten, Anforderungen, Angebotsuebernahmen, Angebotsvarianten, Angebotsvorhaben, Aufgaben, Beteiligte, Entscheidungen, Fachbeitraege } from '@/types/app';
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

interface AnforderungenMaps {
  angebotsvorhabenMap: Map<string, Angebotsvorhaben>;
  anforderungenMap: Map<string, Anforderungen>;
}

export function enrichAnforderungen(
  anforderungen: Anforderungen[],
  maps: AnforderungenMaps
): EnrichedAnforderungen[] {
  return anforderungen.map(r => ({
    ...r,
    vorhabenName: resolveDisplay(r.fields.vorhaben, maps.angebotsvorhabenMap, 'bezeichnung'),
    vorgaengerversionName: resolveDisplay(r.fields.vorgaengerversion, maps.anforderungenMap, 'titel'),
  }));
}

interface FachbeitraegeMaps {
  angebotsvorhabenMap: Map<string, Angebotsvorhaben>;
  aufgabenMap: Map<string, Aufgaben>;
  beteiligteMap: Map<string, Beteiligte>;
  anforderungenMap: Map<string, Anforderungen>;
  angebotsvariantenMap: Map<string, Angebotsvarianten>;
}

export function enrichFachbeitraege(
  fachbeitraege: Fachbeitraege[],
  maps: FachbeitraegeMaps
): EnrichedFachbeitraege[] {
  return fachbeitraege.map(r => ({
    ...r,
    vorhabenName: resolveDisplay(r.fields.vorhaben, maps.angebotsvorhabenMap, 'bezeichnung'),
    aufgabeName: resolveDisplay(r.fields.aufgabe, maps.aufgabenMap, 'titel'),
    autorName: resolveDisplay(r.fields.autor, maps.beteiligteMap, 'vorname', 'nachname'),
    anforderungName: resolveDisplay(r.fields.anforderung, maps.anforderungenMap, 'titel'),
    varianteName: resolveDisplay(r.fields.variante, maps.angebotsvariantenMap, 'variantenbezeichnung'),
  }));
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
  angebotsvariantenMap: Map<string, Angebotsvarianten>;
  angebotsvorhabenMap: Map<string, Angebotsvorhaben>;
}

export function enrichAngebotsvarianten(
  angebotsvarianten: Angebotsvarianten[],
  maps: AngebotsvariantenMaps
): EnrichedAngebotsvarianten[] {
  return angebotsvarianten.map(r => ({
    ...r,
    vorgaengerversionName: resolveDisplay(r.fields.vorgaengerversion, maps.angebotsvariantenMap, 'variantenbezeichnung'),
    vorhabenName: resolveDisplay(r.fields.vorhaben, maps.angebotsvorhabenMap, 'bezeichnung'),
  }));
}

interface AbhaengigkeitenMaps {
  angebotsvorhabenMap: Map<string, Angebotsvorhaben>;
  aufgabenMap: Map<string, Aufgaben>;
  angebotsvariantenMap: Map<string, Angebotsvarianten>;
  anforderungenMap: Map<string, Anforderungen>;
  fachbeitraegeMap: Map<string, Fachbeitraege>;
}

export function enrichAbhaengigkeiten(
  abhaengigkeiten: Abhaengigkeiten[],
  maps: AbhaengigkeitenMaps
): EnrichedAbhaengigkeiten[] {
  return abhaengigkeiten.map(r => ({
    ...r,
    vorhabenName: resolveDisplay(r.fields.vorhaben, maps.angebotsvorhabenMap, 'bezeichnung'),
    abhaengige_aufgabeName: resolveDisplay(r.fields.abhaengige_aufgabe, maps.aufgabenMap, 'titel'),
    grundlage_varianteName: resolveDisplay(r.fields.grundlage_variante, maps.angebotsvariantenMap, 'variantenbezeichnung'),
    grundlage_aufgabeName: resolveDisplay(r.fields.grundlage_aufgabe, maps.aufgabenMap, 'titel'),
    grundlage_anforderungName: resolveDisplay(r.fields.grundlage_anforderung, maps.anforderungenMap, 'titel'),
    grundlage_beitragName: resolveDisplay(r.fields.grundlage_beitrag, maps.fachbeitraegeMap, 'inhalt'),
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

interface AngebotsuebernahmenMaps {
  anforderungenMap: Map<string, Anforderungen>;
  fachbeitraegeMap: Map<string, Fachbeitraege>;
  angebotsvorhabenMap: Map<string, Angebotsvorhaben>;
  angebotsvariantenMap: Map<string, Angebotsvarianten>;
  entscheidungenMap: Map<string, Entscheidungen>;
  beteiligteMap: Map<string, Beteiligte>;
}

export function enrichAngebotsuebernahmen(
  angebotsuebernahmen: Angebotsuebernahmen[],
  maps: AngebotsuebernahmenMaps
): EnrichedAngebotsuebernahmen[] {
  return angebotsuebernahmen.map(r => ({
    ...r,
    anforderungName: resolveDisplay(r.fields.anforderung, maps.anforderungenMap, 'titel'),
    beitragName: resolveDisplay(r.fields.beitrag, maps.fachbeitraegeMap, 'inhalt'),
    vorhabenName: resolveDisplay(r.fields.vorhaben, maps.angebotsvorhabenMap, 'bezeichnung'),
    varianteName: resolveDisplay(r.fields.variante, maps.angebotsvariantenMap, 'variantenbezeichnung'),
    entscheidungName: resolveDisplay(r.fields.entscheidung, maps.entscheidungenMap, 'frage'),
    uebernommen_vonName: resolveDisplay(r.fields.uebernommen_von, maps.beteiligteMap, 'vorname', 'nachname'),
  }));
}

interface EntscheidungenMaps {
  angebotsvariantenMap: Map<string, Angebotsvarianten>;
  beteiligteMap: Map<string, Beteiligte>;
  angebotsvorhabenMap: Map<string, Angebotsvorhaben>;
  aufgabenMap: Map<string, Aufgaben>;
}

export function enrichEntscheidungen(
  entscheidungen: Entscheidungen[],
  maps: EntscheidungenMaps
): EnrichedEntscheidungen[] {
  return entscheidungen.map(r => ({
    ...r,
    varianteName: resolveDisplay(r.fields.variante, maps.angebotsvariantenMap, 'variantenbezeichnung'),
    freigeberName: resolveDisplay(r.fields.freigeber, maps.beteiligteMap, 'vorname', 'nachname'),
    vorhabenName: resolveDisplay(r.fields.vorhaben, maps.angebotsvorhabenMap, 'bezeichnung'),
    entscheiderName: resolveDisplay(r.fields.entscheider, maps.beteiligteMap, 'vorname', 'nachname'),
    aufgabeName: resolveDisplay(r.fields.aufgabe, maps.aufgabenMap, 'titel'),
  }));
}
