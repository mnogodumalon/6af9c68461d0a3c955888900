/**
 * Required-field messages — WRITTEN BY THE BUILD AGENT, never by a heuristic.
 *
 * The layer knows two things about an empty required field: that it is
 * required and what its label is. Out of that it can only say „„Anreise" ist
 * ein Pflichtfeld". What the person should do instead („Bitte einen Gast
 * auswählen.") is meaning, and meaning is the agent's: the Phase-2 orchestrator
 * writes one short instruction per required field — what is needed, not why — to
 * `.intents-staging/messages.json`, the integration step validates it against
 * the app metadata and renders it into the block below. Scaffold updates keep
 * the block. Do not edit outside the markers.
 *
 * Every door reads this and nothing else: `useStepForm` (flows and public
 * pages), the generated {Entity}Dialog and the public form's server-error line.
 * A field without a sentence falls back to the label sentence — never to a
 * bare „Dieses Feld ist erforderlich".
 *
 * Required fields per entity (from the base view):
 *   - beteiligte: vorname (Vorname), nachname (Nachname), fachbereich (Fachbereich)
 *   - anforderungen: vorhaben (Angebotsvorhaben), titel (Titel), quellenart (Art der Quelle), version (Version), status (Status)
 *   - fachbeitraege: vorhaben (Angebotsvorhaben), aufgabe (Zugehörige Aufgabe), autor (Autor), inhalt (Inhalt des Beitrags), status (Status)
 *   - angebotsvorhaben: bezeichnung (Vorhabenbezeichnung), kundenname (Kunde), phase (Phase)
 *   - angebotsvarianten: status (Status), vorhaben (Angebotsvorhaben), variantenbezeichnung (Variantenbezeichnung)
 *   - abhaengigkeiten: vorhaben (Angebotsvorhaben), abhaengige_aufgabe (Abhängige Aufgabe), grundlage_art (Grundlage ist), pruefung_status (Stand der Prüfung)
 *   - aufgaben: titel (Titel), vorhaben (Angebotsvorhaben), art (Art der Untersuchung), status (Status)
 *   - angebotsuebernahmen: vorhaben (Angebotsvorhaben), variante (Angebotsvariante), entscheidung (Freigebende Entscheidung), inhaltsart (Art des Inhalts), angebotstext (Text im Angebot)
 *   - entscheidungen: vorhaben (Angebotsvorhaben), frage (Entscheidungsfrage), ergebnis (Ergebnis), entscheider (Entscheider)
 */
import { t, tx } from '@/i18n';
import { labelOf, type EntityKey } from './rules';

/** The writable fields of each entity — the keys a message may address (generated). */
export interface MessageFields {
  "beteiligte": "entscheidungsgrenze" | "vorname" | "nachname" | "email" | "rolle" | "telefon" | "fachbereich" | "aktiv";
  "anforderungen": "vorhaben" | "titel" | "beschreibung" | "quellenart" | "quellenangabe" | "version" | "status" | "gueltig_ab" | "vorgaengerversion";
  "fachbeitraege": "vorhaben" | "aufgabe" | "autor" | "anforderung" | "variante" | "inhalt" | "bedingungen" | "gueltig_von" | "gueltig_bis" | "status";
  "angebotsvorhaben": "bezeichnung" | "kundenname" | "anfragenummer" | "eingangsdatum" | "abgabefrist" | "anfragebeschreibung" | "liefergegenstand" | "phase" | "prioritaet" | "auftragsvolumen" | "projektleitung" | "besonderheiten";
  "angebotsvarianten": "angebotspreis" | "akzeptierte_risiken" | "vorgaengerversion" | "version" | "vertragsbedingungen" | "status" | "herstellkosten" | "beschaffungskosten" | "aufwand_stunden" | "vorhaben" | "variantenbezeichnung" | "beschreibung" | "menge" | "teillieferung" | "liefertermin";
  "abhaengigkeiten": "vorhaben" | "abhaengige_aufgabe" | "grundlage_art" | "grundlage_variante" | "grundlage_aufgabe" | "aenderung" | "pruefung_noetig" | "pruefung_status" | "grundlage_anforderung" | "grundlage_beitrag" | "geprueft_am";
  "aufgaben": "titel" | "vorhaben" | "art" | "verantwortlicher" | "faelligkeit" | "status" | "ausloeser" | "fragestellung" | "ergebnis" | "folgeaufgabe_noetig" | "folgeaufgabe_hinweis" | "ausloesende_aufgabe";
  "angebotsuebernahmen": "anforderung" | "beitrag" | "vorhaben" | "variante" | "entscheidung" | "inhaltsart" | "angebotstext" | "uebernommen_von" | "uebernahmedatum" | "bemerkung";
  "entscheidungen": "variante" | "freigabestatus" | "freigeber" | "freigabedatum" | "vorhaben" | "frage" | "ergebnis" | "begruendung" | "bedingungen" | "finanzielle_auswirkung" | "entscheider" | "entscheidungsdatum" | "freigabe_noetig" | "aufgabe";
}
export type MessageFieldKey<E extends EntityKey> = E extends keyof MessageFields ? MessageFields[E] : never;

export const REQUIRED_MESSAGES: { [E in EntityKey]?: Partial<Record<MessageFieldKey<E>, string>> } = {
  // <custom:messages>
  beteiligte: { vorname: "Bitte den Vornamen eingeben.", nachname: "Bitte den Nachnamen eingeben.", fachbereich: "Bitte einen Fachbereich wählen." },
  angebotsvorhaben: { bezeichnung: "Bitte eine Vorhabenbezeichnung eingeben.", kundenname: "Bitte den Kunden eingeben.", phase: "Bitte eine Phase wählen." },
  angebotsvarianten: { status: "Bitte einen Status wählen.", vorhaben: "Bitte ein Angebotsvorhaben auswählen.", variantenbezeichnung: "Bitte eine Bezeichnung für die Variante eingeben." },
  aufgaben: { titel: "Bitte einen Titel eingeben.", vorhaben: "Bitte ein Angebotsvorhaben auswählen.", art: "Bitte die Art der Untersuchung wählen.", status: "Bitte einen Status wählen." },
  entscheidungen: { vorhaben: "Bitte ein Angebotsvorhaben auswählen.", frage: "Bitte die Entscheidungsfrage eingeben.", ergebnis: "Bitte das Ergebnis wählen.", entscheider: "Bitte einen Entscheider auswählen." },
  // </custom:messages>
};

/** The sentence shown when `key` of `entity` is required and empty — the
 *  agent's own text (translated at runtime like every page string), else the
 *  label sentence. Call it while rendering, not at module scope. */
export function requiredMessage(entity: EntityKey, key: string): string {
  const own = (REQUIRED_MESSAGES as Record<string, Record<string, string | undefined> | undefined>)[entity]?.[key];
  if (own && own.trim()) return tx(own);
  return t('v_required', { label: labelOf(entity, key) });
}

/** True when the agent wrote a sentence for the field. */
export function hasOwnMessage(entity: EntityKey, key: string): boolean {
  const own = (REQUIRED_MESSAGES as Record<string, Record<string, string | undefined> | undefined>)[entity]?.[key];
  return Boolean(own && own.trim());
}
