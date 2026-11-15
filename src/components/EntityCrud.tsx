/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'beteiligte'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.beteiligte.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.beteiligte.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.beteiligte.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.beteiligte              // the display-ready array for EVERY entity —
 *                                       // Enriched* where relations exist, the raw array
 *                                       // otherwise. Reuse these; never call enrich*()
 *                                       // in the page, and never guess which entity has
 *                                       // one: they all do.
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled; list-field back-references additionally get a
 * "choose existing" picker that links an EXISTING record — built in, do not
 * re-roll). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   beteiligte: entscheidungsgrenze, vorname, nachname, email, rolle, telefon, fachbereich, aktiv  ·  ← fachbeitraege (list + contextual +) · ← angebotsvorhaben (list + contextual +) · ← aufgaben (list + contextual +) · ← angebotsuebernahmen (list + contextual +) · ← entscheidungen (list + contextual +) · ← entscheidungen (list + contextual +)
 *   anforderungen: vorhaben, titel, beschreibung, quellenart, quellenangabe, version, status, gueltig_ab, …  ·  → angebotsvorhaben · → anforderungen · ← fachbeitraege (list + contextual +) · ← abhaengigkeiten (list + contextual +) · ← angebotsuebernahmen (list + contextual +)
 *   fachbeitraege: vorhaben, aufgabe, autor, anforderung, variante, inhalt, bedingungen, gueltig_von, …  ·  → angebotsvorhaben · → aufgaben · → beteiligte · → anforderungen · → angebotsvarianten · ← abhaengigkeiten (list + contextual +) · ← angebotsuebernahmen (list + contextual +)
 *   angebotsvorhaben: bezeichnung, kundenname, anfragenummer, eingangsdatum, abgabefrist, anfragebeschreibung, liefergegenstand, phase, …  ·  → beteiligte · ← anforderungen (list + contextual +) · ← fachbeitraege (list + contextual +) · ← angebotsvarianten (list + contextual +) · ← abhaengigkeiten (list + contextual +) · ← aufgaben (list + contextual +) · ← angebotsuebernahmen (list + contextual +) · ← entscheidungen (list + contextual +)
 *   angebotsvarianten: angebotspreis, akzeptierte_risiken, vorgaengerversion, version, vertragsbedingungen, status, herstellkosten, beschaffungskosten, …  ·  → angebotsvarianten · → angebotsvorhaben · ← fachbeitraege (list + contextual +) · ← abhaengigkeiten (list + contextual +) · ← angebotsuebernahmen (list + contextual +) · ← entscheidungen (list + contextual +)
 *   abhaengigkeiten: vorhaben, abhaengige_aufgabe, grundlage_art, grundlage_variante, grundlage_aufgabe, aenderung, pruefung_noetig, pruefung_status, …  ·  → angebotsvorhaben · → aufgaben · → angebotsvarianten · → anforderungen · → fachbeitraege
 *   aufgaben: titel, vorhaben, art, verantwortlicher, faelligkeit, status, ausloeser, fragestellung, …  ·  → angebotsvorhaben · → beteiligte · → aufgaben · ← fachbeitraege (list + contextual +) · ← abhaengigkeiten (list + contextual +) · ← abhaengigkeiten (list + contextual +) · ← entscheidungen (list + contextual +)
 *   angebotsuebernahmen: anforderung, beitrag, vorhaben, variante, entscheidung, inhaltsart, angebotstext, uebernommen_von, …  ·  → anforderungen · → fachbeitraege · → angebotsvorhaben · → angebotsvarianten · → entscheidungen · → beteiligte
 *   entscheidungen: variante, freigabestatus, freigeber, freigabedatum, vorhaben, frage, ergebnis, begruendung, …  ·  → angebotsvarianten · → beteiligte · → angebotsvorhaben · → aufgaben · ← angebotsuebernahmen (list + contextual +)
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { Beteiligte, Anforderungen, Fachbeitraege, Angebotsvorhaben, Angebotsvarianten, Abhaengigkeiten, Aufgaben, Angebotsuebernahmen, Entscheidungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { enrichAnforderungen, enrichFachbeitraege, enrichAngebotsvorhaben, enrichAngebotsvarianten, enrichAbhaengigkeiten, enrichAufgaben, enrichAngebotsuebernahmen, enrichEntscheidungen } from '@/lib/enrich';
import type { EnrichedAnforderungen, EnrichedFachbeitraege, EnrichedAngebotsvorhaben, EnrichedAngebotsvarianten, EnrichedAbhaengigkeiten, EnrichedAufgaben, EnrichedAngebotsuebernahmen, EnrichedEntscheidungen } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { BeteiligteDialog, type BeteiligteDialogDefaults } from '@/components/dialogs/BeteiligteDialog';
import { BeteiligteDetails } from '@/components/details/BeteiligteDetails';
import { AnforderungenDialog, type AnforderungenDialogDefaults } from '@/components/dialogs/AnforderungenDialog';
import { AnforderungenDetails } from '@/components/details/AnforderungenDetails';
import { FachbeitraegeDialog, type FachbeitraegeDialogDefaults } from '@/components/dialogs/FachbeitraegeDialog';
import { FachbeitraegeDetails } from '@/components/details/FachbeitraegeDetails';
import { AngebotsvorhabenDialog, type AngebotsvorhabenDialogDefaults } from '@/components/dialogs/AngebotsvorhabenDialog';
import { AngebotsvorhabenDetails } from '@/components/details/AngebotsvorhabenDetails';
import { AngebotsvariantenDialog, type AngebotsvariantenDialogDefaults } from '@/components/dialogs/AngebotsvariantenDialog';
import { AngebotsvariantenDetails } from '@/components/details/AngebotsvariantenDetails';
import { AbhaengigkeitenDialog, type AbhaengigkeitenDialogDefaults } from '@/components/dialogs/AbhaengigkeitenDialog';
import { AbhaengigkeitenDetails } from '@/components/details/AbhaengigkeitenDetails';
import { AufgabenDialog, type AufgabenDialogDefaults } from '@/components/dialogs/AufgabenDialog';
import { AufgabenDetails } from '@/components/details/AufgabenDetails';
import { AngebotsuebernahmenDialog, type AngebotsuebernahmenDialogDefaults } from '@/components/dialogs/AngebotsuebernahmenDialog';
import { AngebotsuebernahmenDetails } from '@/components/details/AngebotsuebernahmenDetails';
import { EntscheidungenDialog, type EntscheidungenDialogDefaults } from '@/components/dialogs/EntscheidungenDialog';
import { EntscheidungenDetails } from '@/components/details/EntscheidungenDetails';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { usePermissions } from '@/lib/permissions';
import { toast } from 'sonner';
import { displayNameOf, displayPart } from '@/lib/journey/rules';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'beteiligte'; record: Beteiligte }
  | { type: 'anforderungen'; record: EnrichedAnforderungen }
  | { type: 'fachbeitraege'; record: EnrichedFachbeitraege }
  | { type: 'angebotsvorhaben'; record: EnrichedAngebotsvorhaben }
  | { type: 'angebotsvarianten'; record: EnrichedAngebotsvarianten }
  | { type: 'abhaengigkeiten'; record: EnrichedAbhaengigkeiten }
  | { type: 'aufgaben'; record: EnrichedAufgaben }
  | { type: 'angebotsuebernahmen'; record: EnrichedAngebotsuebernahmen }
  | { type: 'entscheidungen'; record: EnrichedEntscheidungen };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  /** The action may return a sentence — the reason the step was NOT taken; the overlay shows it under the button. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void | string | Promise<void | string> } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
  /** May the signed-in user create/change records of this list? (the
   *  platform's rights — show a „+ Neu“ only when true; openCreate/openEdit
   *  refuse with a notice otherwise). */
  canWrite: boolean;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  beteiligte: EntityCrudApi<Beteiligte, BeteiligteDialogDefaults>;
  anforderungen: EntityCrudApi<Anforderungen, AnforderungenDialogDefaults>;
  fachbeitraege: EntityCrudApi<Fachbeitraege, FachbeitraegeDialogDefaults>;
  angebotsvorhaben: EntityCrudApi<Angebotsvorhaben, AngebotsvorhabenDialogDefaults>;
  angebotsvarianten: EntityCrudApi<Angebotsvarianten, AngebotsvariantenDialogDefaults>;
  abhaengigkeiten: EntityCrudApi<Abhaengigkeiten, AbhaengigkeitenDialogDefaults>;
  aufgaben: EntityCrudApi<Aufgaben, AufgabenDialogDefaults>;
  angebotsuebernahmen: EntityCrudApi<Angebotsuebernahmen, AngebotsuebernahmenDialogDefaults>;
  entscheidungen: EntityCrudApi<Entscheidungen, EntscheidungenDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { beteiligte: Beteiligte[]; anforderungen: EnrichedAnforderungen[]; fachbeitraege: EnrichedFachbeitraege[]; angebotsvorhaben: EnrichedAngebotsvorhaben[]; angebotsvarianten: EnrichedAngebotsvarianten[]; abhaengigkeiten: EnrichedAbhaengigkeiten[]; aufgaben: EnrichedAufgaben[]; angebotsuebernahmen: EnrichedAngebotsuebernahmen[]; entscheidungen: EnrichedEntscheidungen[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  // the platform's rights of the signed-in user (lib/permissions.ts) — unknown = allowed
  const perms = usePermissions();
  const refuse = () => { toast.error(t('perm_denied_title'), { description: t('perm_denied_desc') }); };
  const [beteiligteDialog, setBeteiligteDialog] = useState<{ defaults?: BeteiligteDialogDefaults; editing?: Beteiligte } | null>(null);
  const [anforderungenDialog, setAnforderungenDialog] = useState<{ defaults?: AnforderungenDialogDefaults; editing?: Anforderungen } | null>(null);
  const [fachbeitraegeDialog, setFachbeitraegeDialog] = useState<{ defaults?: FachbeitraegeDialogDefaults; editing?: Fachbeitraege } | null>(null);
  const [angebotsvorhabenDialog, setAngebotsvorhabenDialog] = useState<{ defaults?: AngebotsvorhabenDialogDefaults; editing?: Angebotsvorhaben } | null>(null);
  const [angebotsvariantenDialog, setAngebotsvariantenDialog] = useState<{ defaults?: AngebotsvariantenDialogDefaults; editing?: Angebotsvarianten } | null>(null);
  const [abhaengigkeitenDialog, setAbhaengigkeitenDialog] = useState<{ defaults?: AbhaengigkeitenDialogDefaults; editing?: Abhaengigkeiten } | null>(null);
  const [aufgabenDialog, setAufgabenDialog] = useState<{ defaults?: AufgabenDialogDefaults; editing?: Aufgaben } | null>(null);
  const [angebotsuebernahmenDialog, setAngebotsuebernahmenDialog] = useState<{ defaults?: AngebotsuebernahmenDialogDefaults; editing?: Angebotsuebernahmen } | null>(null);
  const [entscheidungenDialog, setEntscheidungenDialog] = useState<{ defaults?: EntscheidungenDialogDefaults; editing?: Entscheidungen } | null>(null);
  const enrichedAnforderungen = useMemo(() => enrichAnforderungen(data.anforderungen, { angebotsvorhabenMap: data.angebotsvorhabenMap, anforderungenMap: data.anforderungenMap }), [data.anforderungen, data.angebotsvorhabenMap, data.anforderungenMap]);
  const enrichedFachbeitraege = useMemo(() => enrichFachbeitraege(data.fachbeitraege, { angebotsvorhabenMap: data.angebotsvorhabenMap, aufgabenMap: data.aufgabenMap, beteiligteMap: data.beteiligteMap, anforderungenMap: data.anforderungenMap, angebotsvariantenMap: data.angebotsvariantenMap }), [data.fachbeitraege, data.angebotsvorhabenMap, data.aufgabenMap, data.beteiligteMap, data.anforderungenMap, data.angebotsvariantenMap]);
  const enrichedAngebotsvorhaben = useMemo(() => enrichAngebotsvorhaben(data.angebotsvorhaben, { beteiligteMap: data.beteiligteMap }), [data.angebotsvorhaben, data.beteiligteMap]);
  const enrichedAngebotsvarianten = useMemo(() => enrichAngebotsvarianten(data.angebotsvarianten, { angebotsvariantenMap: data.angebotsvariantenMap, angebotsvorhabenMap: data.angebotsvorhabenMap }), [data.angebotsvarianten, data.angebotsvariantenMap, data.angebotsvorhabenMap]);
  const enrichedAbhaengigkeiten = useMemo(() => enrichAbhaengigkeiten(data.abhaengigkeiten, { angebotsvorhabenMap: data.angebotsvorhabenMap, aufgabenMap: data.aufgabenMap, angebotsvariantenMap: data.angebotsvariantenMap, anforderungenMap: data.anforderungenMap, fachbeitraegeMap: data.fachbeitraegeMap }), [data.abhaengigkeiten, data.angebotsvorhabenMap, data.aufgabenMap, data.angebotsvariantenMap, data.anforderungenMap, data.fachbeitraegeMap]);
  const enrichedAufgaben = useMemo(() => enrichAufgaben(data.aufgaben, { angebotsvorhabenMap: data.angebotsvorhabenMap, beteiligteMap: data.beteiligteMap, aufgabenMap: data.aufgabenMap }), [data.aufgaben, data.angebotsvorhabenMap, data.beteiligteMap, data.aufgabenMap]);
  const enrichedAngebotsuebernahmen = useMemo(() => enrichAngebotsuebernahmen(data.angebotsuebernahmen, { anforderungenMap: data.anforderungenMap, fachbeitraegeMap: data.fachbeitraegeMap, angebotsvorhabenMap: data.angebotsvorhabenMap, angebotsvariantenMap: data.angebotsvariantenMap, entscheidungenMap: data.entscheidungenMap, beteiligteMap: data.beteiligteMap }), [data.angebotsuebernahmen, data.anforderungenMap, data.fachbeitraegeMap, data.angebotsvorhabenMap, data.angebotsvariantenMap, data.entscheidungenMap, data.beteiligteMap]);
  const enrichedEntscheidungen = useMemo(() => enrichEntscheidungen(data.entscheidungen, { angebotsvariantenMap: data.angebotsvariantenMap, beteiligteMap: data.beteiligteMap, angebotsvorhabenMap: data.angebotsvorhabenMap, aufgabenMap: data.aufgabenMap }), [data.entscheidungen, data.angebotsvariantenMap, data.beteiligteMap, data.angebotsvorhabenMap, data.aufgabenMap]);

  function detailBeteiligte(record: Beteiligte, push = false) {
    const item: OverlayItem = { type: 'beteiligte', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitBeteiligte(fields: Beteiligte['fields']) {
    const editing = beteiligteDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setBeteiligte(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateBeteiligteEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('beteiligte')} — ${t('crud_updated')}`, async () => {
        data.setBeteiligte(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateBeteiligteEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createBeteiligteEntry(fields);
      undoToast(`${appLabel('beteiligte')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailAnforderungen(record: Anforderungen, push = false) {
    const rec = enrichedAnforderungen.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'anforderungen', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitAnforderungen(fields: Anforderungen['fields']) {
    const editing = anforderungenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setAnforderungen(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateAnforderungenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('anforderungen')} — ${t('crud_updated')}`, async () => {
        data.setAnforderungen(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateAnforderungenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createAnforderungenEntry(fields);
      undoToast(`${appLabel('anforderungen')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailFachbeitraege(record: Fachbeitraege, push = false) {
    const rec = enrichedFachbeitraege.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'fachbeitraege', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitFachbeitraege(fields: Fachbeitraege['fields']) {
    const editing = fachbeitraegeDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setFachbeitraege(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateFachbeitraegeEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('fachbeitraege')} — ${t('crud_updated')}`, async () => {
        data.setFachbeitraege(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateFachbeitraegeEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createFachbeitraegeEntry(fields);
      undoToast(`${appLabel('fachbeitraege')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailAngebotsvorhaben(record: Angebotsvorhaben, push = false) {
    const rec = enrichedAngebotsvorhaben.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'angebotsvorhaben', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitAngebotsvorhaben(fields: Angebotsvorhaben['fields']) {
    const editing = angebotsvorhabenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setAngebotsvorhaben(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateAngebotsvorhabenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('angebotsvorhaben')} — ${t('crud_updated')}`, async () => {
        data.setAngebotsvorhaben(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateAngebotsvorhabenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createAngebotsvorhabenEntry(fields);
      undoToast(`${appLabel('angebotsvorhaben')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailAngebotsvarianten(record: Angebotsvarianten, push = false) {
    const rec = enrichedAngebotsvarianten.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'angebotsvarianten', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitAngebotsvarianten(fields: Angebotsvarianten['fields']) {
    const editing = angebotsvariantenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setAngebotsvarianten(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateAngebotsvariantenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('angebotsvarianten')} — ${t('crud_updated')}`, async () => {
        data.setAngebotsvarianten(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateAngebotsvariantenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createAngebotsvariantenEntry(fields);
      undoToast(`${appLabel('angebotsvarianten')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailAbhaengigkeiten(record: Abhaengigkeiten, push = false) {
    const rec = enrichedAbhaengigkeiten.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'abhaengigkeiten', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitAbhaengigkeiten(fields: Abhaengigkeiten['fields']) {
    const editing = abhaengigkeitenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setAbhaengigkeiten(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateAbhaengigkeitenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('abhaengigkeiten')} — ${t('crud_updated')}`, async () => {
        data.setAbhaengigkeiten(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateAbhaengigkeitenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createAbhaengigkeitenEntry(fields);
      undoToast(`${appLabel('abhaengigkeiten')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailAufgaben(record: Aufgaben, push = false) {
    const rec = enrichedAufgaben.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'aufgaben', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitAufgaben(fields: Aufgaben['fields']) {
    const editing = aufgabenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setAufgaben(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateAufgabenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('aufgaben')} — ${t('crud_updated')}`, async () => {
        data.setAufgaben(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateAufgabenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createAufgabenEntry(fields);
      undoToast(`${appLabel('aufgaben')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailAngebotsuebernahmen(record: Angebotsuebernahmen, push = false) {
    const rec = enrichedAngebotsuebernahmen.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'angebotsuebernahmen', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitAngebotsuebernahmen(fields: Angebotsuebernahmen['fields']) {
    const editing = angebotsuebernahmenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setAngebotsuebernahmen(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateAngebotsuebernahmenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('angebotsuebernahmen')} — ${t('crud_updated')}`, async () => {
        data.setAngebotsuebernahmen(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateAngebotsuebernahmenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createAngebotsuebernahmenEntry(fields);
      undoToast(`${appLabel('angebotsuebernahmen')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailEntscheidungen(record: Entscheidungen, push = false) {
    const rec = enrichedEntscheidungen.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'entscheidungen', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitEntscheidungen(fields: Entscheidungen['fields']) {
    const editing = entscheidungenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setEntscheidungen(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateEntscheidungenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('entscheidungen')} — ${t('crud_updated')}`, async () => {
        data.setEntscheidungen(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateEntscheidungenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createEntscheidungenEntry(fields);
      undoToast(`${appLabel('entscheidungen')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <BeteiligteDialog
        open={beteiligteDialog !== null}
        onClose={() => setBeteiligteDialog(null)}
        onSubmit={submitBeteiligte}
        defaultValues={beteiligteDialog?.defaults}
        recordId={beteiligteDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Beteiligte']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Beteiligte']}
      />
      <AnforderungenDialog
        open={anforderungenDialog !== null}
        onClose={() => setAnforderungenDialog(null)}
        onSubmit={submitAnforderungen}
        defaultValues={anforderungenDialog?.defaults}
        recordId={anforderungenDialog?.editing?.record_id}
        angebotsvorhabenList={data.angebotsvorhaben}
        anforderungenList={data.anforderungen}
        enablePhotoScan={AI_PHOTO_SCAN['Anforderungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Anforderungen']}
      />
      <FachbeitraegeDialog
        open={fachbeitraegeDialog !== null}
        onClose={() => setFachbeitraegeDialog(null)}
        onSubmit={submitFachbeitraege}
        defaultValues={fachbeitraegeDialog?.defaults}
        recordId={fachbeitraegeDialog?.editing?.record_id}
        angebotsvorhabenList={data.angebotsvorhaben}
        aufgabenList={data.aufgaben}
        beteiligteList={data.beteiligte}
        anforderungenList={data.anforderungen}
        angebotsvariantenList={data.angebotsvarianten}
        enablePhotoScan={AI_PHOTO_SCAN['Fachbeitraege']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Fachbeitraege']}
      />
      <AngebotsvorhabenDialog
        open={angebotsvorhabenDialog !== null}
        onClose={() => setAngebotsvorhabenDialog(null)}
        onSubmit={submitAngebotsvorhaben}
        defaultValues={angebotsvorhabenDialog?.defaults}
        recordId={angebotsvorhabenDialog?.editing?.record_id}
        beteiligteList={data.beteiligte}
        enablePhotoScan={AI_PHOTO_SCAN['Angebotsvorhaben']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Angebotsvorhaben']}
      />
      <AngebotsvariantenDialog
        open={angebotsvariantenDialog !== null}
        onClose={() => setAngebotsvariantenDialog(null)}
        onSubmit={submitAngebotsvarianten}
        defaultValues={angebotsvariantenDialog?.defaults}
        recordId={angebotsvariantenDialog?.editing?.record_id}
        angebotsvariantenList={data.angebotsvarianten}
        angebotsvorhabenList={data.angebotsvorhaben}
        enablePhotoScan={AI_PHOTO_SCAN['Angebotsvarianten']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Angebotsvarianten']}
      />
      <AbhaengigkeitenDialog
        open={abhaengigkeitenDialog !== null}
        onClose={() => setAbhaengigkeitenDialog(null)}
        onSubmit={submitAbhaengigkeiten}
        defaultValues={abhaengigkeitenDialog?.defaults}
        recordId={abhaengigkeitenDialog?.editing?.record_id}
        angebotsvorhabenList={data.angebotsvorhaben}
        aufgabenList={data.aufgaben}
        angebotsvariantenList={data.angebotsvarianten}
        anforderungenList={data.anforderungen}
        fachbeitraegeList={data.fachbeitraege}
        enablePhotoScan={AI_PHOTO_SCAN['Abhaengigkeiten']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Abhaengigkeiten']}
      />
      <AufgabenDialog
        open={aufgabenDialog !== null}
        onClose={() => setAufgabenDialog(null)}
        onSubmit={submitAufgaben}
        defaultValues={aufgabenDialog?.defaults}
        recordId={aufgabenDialog?.editing?.record_id}
        angebotsvorhabenList={data.angebotsvorhaben}
        beteiligteList={data.beteiligte}
        aufgabenList={data.aufgaben}
        enablePhotoScan={AI_PHOTO_SCAN['Aufgaben']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Aufgaben']}
      />
      <AngebotsuebernahmenDialog
        open={angebotsuebernahmenDialog !== null}
        onClose={() => setAngebotsuebernahmenDialog(null)}
        onSubmit={submitAngebotsuebernahmen}
        defaultValues={angebotsuebernahmenDialog?.defaults}
        recordId={angebotsuebernahmenDialog?.editing?.record_id}
        anforderungenList={data.anforderungen}
        fachbeitraegeList={data.fachbeitraege}
        angebotsvorhabenList={data.angebotsvorhaben}
        angebotsvariantenList={data.angebotsvarianten}
        entscheidungenList={data.entscheidungen}
        beteiligteList={data.beteiligte}
        enablePhotoScan={AI_PHOTO_SCAN['Angebotsuebernahmen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Angebotsuebernahmen']}
      />
      <EntscheidungenDialog
        open={entscheidungenDialog !== null}
        onClose={() => setEntscheidungenDialog(null)}
        onSubmit={submitEntscheidungen}
        defaultValues={entscheidungenDialog?.defaults}
        recordId={entscheidungenDialog?.editing?.record_id}
        angebotsvariantenList={data.angebotsvarianten}
        beteiligteList={data.beteiligte}
        angebotsvorhabenList={data.angebotsvorhaben}
        aufgabenList={data.aufgaben}
        enablePhotoScan={AI_PHOTO_SCAN['Entscheidungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Entscheidungen']}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'beteiligte') {
            return (
              <>
                <RecordHeader title={displayNameOf('beteiligte', top.record.fields as Record<string, unknown>) || appLabel('beteiligte')} subtitle={undefined} />
                <BeteiligteDetails
                  record={top.record}
                  fachbeitraegeList={data.fachbeitraege}
                  onOpenFachbeitraege={(r) => detailFachbeitraege(r, true)}
                  onAddFachbeitraege={perms.canWrite('fachbeitraege') ? () => setFachbeitraegeDialog({ defaults: { autor: createRecordUrl(APP_IDS.BETEILIGTE, top.record.record_id) } }) : undefined}
                  angebotsvorhabenList={data.angebotsvorhaben}
                  onOpenAngebotsvorhaben={(r) => detailAngebotsvorhaben(r, true)}
                  onAddAngebotsvorhaben={perms.canWrite('angebotsvorhaben') ? () => setAngebotsvorhabenDialog({ defaults: { projektleitung: createRecordUrl(APP_IDS.BETEILIGTE, top.record.record_id) } }) : undefined}
                  aufgabenList={data.aufgaben}
                  onOpenAufgaben={(r) => detailAufgaben(r, true)}
                  onAddAufgaben={perms.canWrite('aufgaben') ? () => setAufgabenDialog({ defaults: { verantwortlicher: createRecordUrl(APP_IDS.BETEILIGTE, top.record.record_id) } }) : undefined}
                  angebotsuebernahmenList={data.angebotsuebernahmen}
                  onOpenAngebotsuebernahmen={(r) => detailAngebotsuebernahmen(r, true)}
                  onAddAngebotsuebernahmen={perms.canWrite('angebotsuebernahmen') ? () => setAngebotsuebernahmenDialog({ defaults: { uebernommen_von: createRecordUrl(APP_IDS.BETEILIGTE, top.record.record_id) } }) : undefined}
                  entscheidungenFreigeberList={data.entscheidungen}
                  onOpenEntscheidungenFreigeber={(r) => detailEntscheidungen(r, true)}
                  onAddEntscheidungenFreigeber={perms.canWrite('entscheidungen') ? () => setEntscheidungenDialog({ defaults: { freigeber: createRecordUrl(APP_IDS.BETEILIGTE, top.record.record_id) } }) : undefined}
                  entscheidungenEntscheiderList={data.entscheidungen}
                  onOpenEntscheidungenEntscheider={(r) => detailEntscheidungen(r, true)}
                  onAddEntscheidungenEntscheider={perms.canWrite('entscheidungen') ? () => setEntscheidungenDialog({ defaults: { entscheider: createRecordUrl(APP_IDS.BETEILIGTE, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'anforderungen') {
            return (
              <>
                <RecordHeader title={displayNameOf('anforderungen', top.record.fields as Record<string, unknown>) || appLabel('anforderungen')} subtitle={top.record.fields.gueltig_ab ? formatDate(top.record.fields.gueltig_ab) : undefined} />
                <AnforderungenDetails
                  record={top.record}
                  angebotsvorhabenList={data.angebotsvorhaben}
                  onOpenAngebotsvorhaben={(r) => detailAngebotsvorhaben(r, true)}
                  anforderungenList={data.anforderungen}
                  onOpenAnforderungen={(r) => detailAnforderungen(r, true)}
                  fachbeitraegeList={data.fachbeitraege}
                  onOpenFachbeitraege={(r) => detailFachbeitraege(r, true)}
                  onAddFachbeitraege={perms.canWrite('fachbeitraege') ? () => setFachbeitraegeDialog({ defaults: { anforderung: createRecordUrl(APP_IDS.ANFORDERUNGEN, top.record.record_id) } }) : undefined}
                  abhaengigkeitenList={data.abhaengigkeiten}
                  onOpenAbhaengigkeiten={(r) => detailAbhaengigkeiten(r, true)}
                  onAddAbhaengigkeiten={perms.canWrite('abhaengigkeiten') ? () => setAbhaengigkeitenDialog({ defaults: { grundlage_anforderung: createRecordUrl(APP_IDS.ANFORDERUNGEN, top.record.record_id) } }) : undefined}
                  angebotsuebernahmenList={data.angebotsuebernahmen}
                  onOpenAngebotsuebernahmen={(r) => detailAngebotsuebernahmen(r, true)}
                  onAddAngebotsuebernahmen={perms.canWrite('angebotsuebernahmen') ? () => setAngebotsuebernahmenDialog({ defaults: { anforderung: createRecordUrl(APP_IDS.ANFORDERUNGEN, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'fachbeitraege') {
            return (
              <>
                <RecordHeader title={displayNameOf('fachbeitraege', top.record.fields as Record<string, unknown>) || appLabel('fachbeitraege')} subtitle={top.record.fields.gueltig_von ? formatDate(top.record.fields.gueltig_von) : undefined} />
                <FachbeitraegeDetails
                  record={top.record}
                  angebotsvorhabenList={data.angebotsvorhaben}
                  onOpenAngebotsvorhaben={(r) => detailAngebotsvorhaben(r, true)}
                  aufgabenList={data.aufgaben}
                  onOpenAufgaben={(r) => detailAufgaben(r, true)}
                  beteiligteList={data.beteiligte}
                  onOpenBeteiligte={(r) => detailBeteiligte(r, true)}
                  anforderungenList={data.anforderungen}
                  onOpenAnforderungen={(r) => detailAnforderungen(r, true)}
                  angebotsvariantenList={data.angebotsvarianten}
                  onOpenAngebotsvarianten={(r) => detailAngebotsvarianten(r, true)}
                  abhaengigkeitenList={data.abhaengigkeiten}
                  onOpenAbhaengigkeiten={(r) => detailAbhaengigkeiten(r, true)}
                  onAddAbhaengigkeiten={perms.canWrite('abhaengigkeiten') ? () => setAbhaengigkeitenDialog({ defaults: { grundlage_beitrag: createRecordUrl(APP_IDS.FACHBEITRAEGE, top.record.record_id) } }) : undefined}
                  angebotsuebernahmenList={data.angebotsuebernahmen}
                  onOpenAngebotsuebernahmen={(r) => detailAngebotsuebernahmen(r, true)}
                  onAddAngebotsuebernahmen={perms.canWrite('angebotsuebernahmen') ? () => setAngebotsuebernahmenDialog({ defaults: { beitrag: createRecordUrl(APP_IDS.FACHBEITRAEGE, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'angebotsvorhaben') {
            return (
              <>
                <RecordHeader title={displayNameOf('angebotsvorhaben', top.record.fields as Record<string, unknown>) || appLabel('angebotsvorhaben')} subtitle={top.record.fields.eingangsdatum ? formatDate(top.record.fields.eingangsdatum) : undefined} />
                <AngebotsvorhabenDetails
                  record={top.record}
                  beteiligteList={data.beteiligte}
                  onOpenBeteiligte={(r) => detailBeteiligte(r, true)}
                  anforderungenList={data.anforderungen}
                  onOpenAnforderungen={(r) => detailAnforderungen(r, true)}
                  onAddAnforderungen={perms.canWrite('anforderungen') ? () => setAnforderungenDialog({ defaults: { vorhaben: createRecordUrl(APP_IDS.ANGEBOTSVORHABEN, top.record.record_id) } }) : undefined}
                  fachbeitraegeList={data.fachbeitraege}
                  onOpenFachbeitraege={(r) => detailFachbeitraege(r, true)}
                  onAddFachbeitraege={perms.canWrite('fachbeitraege') ? () => setFachbeitraegeDialog({ defaults: { vorhaben: createRecordUrl(APP_IDS.ANGEBOTSVORHABEN, top.record.record_id) } }) : undefined}
                  angebotsvariantenList={data.angebotsvarianten}
                  onOpenAngebotsvarianten={(r) => detailAngebotsvarianten(r, true)}
                  onAddAngebotsvarianten={perms.canWrite('angebotsvarianten') ? () => setAngebotsvariantenDialog({ defaults: { vorhaben: createRecordUrl(APP_IDS.ANGEBOTSVORHABEN, top.record.record_id) } }) : undefined}
                  abhaengigkeitenList={data.abhaengigkeiten}
                  onOpenAbhaengigkeiten={(r) => detailAbhaengigkeiten(r, true)}
                  onAddAbhaengigkeiten={perms.canWrite('abhaengigkeiten') ? () => setAbhaengigkeitenDialog({ defaults: { vorhaben: createRecordUrl(APP_IDS.ANGEBOTSVORHABEN, top.record.record_id) } }) : undefined}
                  aufgabenList={data.aufgaben}
                  onOpenAufgaben={(r) => detailAufgaben(r, true)}
                  onAddAufgaben={perms.canWrite('aufgaben') ? () => setAufgabenDialog({ defaults: { vorhaben: createRecordUrl(APP_IDS.ANGEBOTSVORHABEN, top.record.record_id) } }) : undefined}
                  angebotsuebernahmenList={data.angebotsuebernahmen}
                  onOpenAngebotsuebernahmen={(r) => detailAngebotsuebernahmen(r, true)}
                  onAddAngebotsuebernahmen={perms.canWrite('angebotsuebernahmen') ? () => setAngebotsuebernahmenDialog({ defaults: { vorhaben: createRecordUrl(APP_IDS.ANGEBOTSVORHABEN, top.record.record_id) } }) : undefined}
                  entscheidungenList={data.entscheidungen}
                  onOpenEntscheidungen={(r) => detailEntscheidungen(r, true)}
                  onAddEntscheidungen={perms.canWrite('entscheidungen') ? () => setEntscheidungenDialog({ defaults: { vorhaben: createRecordUrl(APP_IDS.ANGEBOTSVORHABEN, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'angebotsvarianten') {
            return (
              <>
                <RecordHeader title={displayNameOf('angebotsvarianten', top.record.fields as Record<string, unknown>) || appLabel('angebotsvarianten')} subtitle={top.record.fields.liefertermin ? formatDate(top.record.fields.liefertermin) : undefined} />
                <AngebotsvariantenDetails
                  record={top.record}
                  angebotsvariantenList={data.angebotsvarianten}
                  onOpenAngebotsvarianten={(r) => detailAngebotsvarianten(r, true)}
                  angebotsvorhabenList={data.angebotsvorhaben}
                  onOpenAngebotsvorhaben={(r) => detailAngebotsvorhaben(r, true)}
                  fachbeitraegeList={data.fachbeitraege}
                  onOpenFachbeitraege={(r) => detailFachbeitraege(r, true)}
                  onAddFachbeitraege={perms.canWrite('fachbeitraege') ? () => setFachbeitraegeDialog({ defaults: { variante: createRecordUrl(APP_IDS.ANGEBOTSVARIANTEN, top.record.record_id) } }) : undefined}
                  abhaengigkeitenList={data.abhaengigkeiten}
                  onOpenAbhaengigkeiten={(r) => detailAbhaengigkeiten(r, true)}
                  onAddAbhaengigkeiten={perms.canWrite('abhaengigkeiten') ? () => setAbhaengigkeitenDialog({ defaults: { grundlage_variante: createRecordUrl(APP_IDS.ANGEBOTSVARIANTEN, top.record.record_id) } }) : undefined}
                  angebotsuebernahmenList={data.angebotsuebernahmen}
                  onOpenAngebotsuebernahmen={(r) => detailAngebotsuebernahmen(r, true)}
                  onAddAngebotsuebernahmen={perms.canWrite('angebotsuebernahmen') ? () => setAngebotsuebernahmenDialog({ defaults: { variante: createRecordUrl(APP_IDS.ANGEBOTSVARIANTEN, top.record.record_id) } }) : undefined}
                  entscheidungenList={data.entscheidungen}
                  onOpenEntscheidungen={(r) => detailEntscheidungen(r, true)}
                  onAddEntscheidungen={perms.canWrite('entscheidungen') ? () => setEntscheidungenDialog({ defaults: { variante: createRecordUrl(APP_IDS.ANGEBOTSVARIANTEN, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'abhaengigkeiten') {
            return (
              <>
                <RecordHeader title={displayNameOf('abhaengigkeiten', top.record.fields as Record<string, unknown>) || appLabel('abhaengigkeiten')} subtitle={top.record.fields.geprueft_am ? formatDate(top.record.fields.geprueft_am) : undefined} />
                <AbhaengigkeitenDetails
                  record={top.record}
                  angebotsvorhabenList={data.angebotsvorhaben}
                  onOpenAngebotsvorhaben={(r) => detailAngebotsvorhaben(r, true)}
                  aufgabenList={data.aufgaben}
                  onOpenAufgaben={(r) => detailAufgaben(r, true)}
                  angebotsvariantenList={data.angebotsvarianten}
                  onOpenAngebotsvarianten={(r) => detailAngebotsvarianten(r, true)}
                  anforderungenList={data.anforderungen}
                  onOpenAnforderungen={(r) => detailAnforderungen(r, true)}
                  fachbeitraegeList={data.fachbeitraege}
                  onOpenFachbeitraege={(r) => detailFachbeitraege(r, true)}
                />
              </>
            );
          }
          if (top.type === 'aufgaben') {
            return (
              <>
                <RecordHeader title={displayNameOf('aufgaben', top.record.fields as Record<string, unknown>) || appLabel('aufgaben')} subtitle={top.record.fields.faelligkeit ? formatDate(top.record.fields.faelligkeit) : undefined} />
                <AufgabenDetails
                  record={top.record}
                  angebotsvorhabenList={data.angebotsvorhaben}
                  onOpenAngebotsvorhaben={(r) => detailAngebotsvorhaben(r, true)}
                  beteiligteList={data.beteiligte}
                  onOpenBeteiligte={(r) => detailBeteiligte(r, true)}
                  aufgabenList={data.aufgaben}
                  onOpenAufgaben={(r) => detailAufgaben(r, true)}
                  fachbeitraegeList={data.fachbeitraege}
                  onOpenFachbeitraege={(r) => detailFachbeitraege(r, true)}
                  onAddFachbeitraege={perms.canWrite('fachbeitraege') ? () => setFachbeitraegeDialog({ defaults: { aufgabe: createRecordUrl(APP_IDS.AUFGABEN, top.record.record_id) } }) : undefined}
                  abhaengigkeitenAbhaengigeAufgabeList={data.abhaengigkeiten}
                  onOpenAbhaengigkeitenAbhaengigeAufgabe={(r) => detailAbhaengigkeiten(r, true)}
                  onAddAbhaengigkeitenAbhaengigeAufgabe={perms.canWrite('abhaengigkeiten') ? () => setAbhaengigkeitenDialog({ defaults: { abhaengige_aufgabe: createRecordUrl(APP_IDS.AUFGABEN, top.record.record_id) } }) : undefined}
                  abhaengigkeitenGrundlageAufgabeList={data.abhaengigkeiten}
                  onOpenAbhaengigkeitenGrundlageAufgabe={(r) => detailAbhaengigkeiten(r, true)}
                  onAddAbhaengigkeitenGrundlageAufgabe={perms.canWrite('abhaengigkeiten') ? () => setAbhaengigkeitenDialog({ defaults: { grundlage_aufgabe: createRecordUrl(APP_IDS.AUFGABEN, top.record.record_id) } }) : undefined}
                  entscheidungenList={data.entscheidungen}
                  onOpenEntscheidungen={(r) => detailEntscheidungen(r, true)}
                  onAddEntscheidungen={perms.canWrite('entscheidungen') ? () => setEntscheidungenDialog({ defaults: { aufgabe: createRecordUrl(APP_IDS.AUFGABEN, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'angebotsuebernahmen') {
            return (
              <>
                <RecordHeader title={displayNameOf('angebotsuebernahmen', top.record.fields as Record<string, unknown>) || appLabel('angebotsuebernahmen')} subtitle={top.record.fields.uebernahmedatum ? formatDate(top.record.fields.uebernahmedatum) : undefined} />
                <AngebotsuebernahmenDetails
                  record={top.record}
                  anforderungenList={data.anforderungen}
                  onOpenAnforderungen={(r) => detailAnforderungen(r, true)}
                  fachbeitraegeList={data.fachbeitraege}
                  onOpenFachbeitraege={(r) => detailFachbeitraege(r, true)}
                  angebotsvorhabenList={data.angebotsvorhaben}
                  onOpenAngebotsvorhaben={(r) => detailAngebotsvorhaben(r, true)}
                  angebotsvariantenList={data.angebotsvarianten}
                  onOpenAngebotsvarianten={(r) => detailAngebotsvarianten(r, true)}
                  entscheidungenList={data.entscheidungen}
                  onOpenEntscheidungen={(r) => detailEntscheidungen(r, true)}
                  beteiligteList={data.beteiligte}
                  onOpenBeteiligte={(r) => detailBeteiligte(r, true)}
                />
              </>
            );
          }
          if (top.type === 'entscheidungen') {
            return (
              <>
                <RecordHeader title={displayNameOf('entscheidungen', top.record.fields as Record<string, unknown>) || appLabel('entscheidungen')} subtitle={top.record.fields.freigabedatum ? formatDate(top.record.fields.freigabedatum) : undefined} />
                <EntscheidungenDetails
                  record={top.record}
                  angebotsvariantenList={data.angebotsvarianten}
                  onOpenAngebotsvarianten={(r) => detailAngebotsvarianten(r, true)}
                  beteiligteList={data.beteiligte}
                  onOpenBeteiligte={(r) => detailBeteiligte(r, true)}
                  angebotsvorhabenList={data.angebotsvorhaben}
                  onOpenAngebotsvorhaben={(r) => detailAngebotsvorhaben(r, true)}
                  aufgabenList={data.aufgaben}
                  onOpenAufgaben={(r) => detailAufgaben(r, true)}
                  angebotsuebernahmenList={data.angebotsuebernahmen}
                  onOpenAngebotsuebernahmen={(r) => detailAngebotsuebernahmen(r, true)}
                  onAddAngebotsuebernahmen={perms.canWrite('angebotsuebernahmen') ? () => setAngebotsuebernahmenDialog({ defaults: { entscheidung: createRecordUrl(APP_IDS.ENTSCHEIDUNGEN, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          return null;
        }}
        canEdit={(top) => {
          if (top.type === 'beteiligte') return perms.canWrite('beteiligte');
          if (top.type === 'anforderungen') return perms.canWrite('anforderungen');
          if (top.type === 'fachbeitraege') return perms.canWrite('fachbeitraege');
          if (top.type === 'angebotsvorhaben') return perms.canWrite('angebotsvorhaben');
          if (top.type === 'angebotsvarianten') return perms.canWrite('angebotsvarianten');
          if (top.type === 'abhaengigkeiten') return perms.canWrite('abhaengigkeiten');
          if (top.type === 'aufgaben') return perms.canWrite('aufgaben');
          if (top.type === 'angebotsuebernahmen') return perms.canWrite('angebotsuebernahmen');
          if (top.type === 'entscheidungen') return perms.canWrite('entscheidungen');
          return true;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'beteiligte') setBeteiligteDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'anforderungen') setAnforderungenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'fachbeitraege') setFachbeitraegeDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'angebotsvorhaben') setAngebotsvorhabenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'angebotsvarianten') setAngebotsvariantenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'abhaengigkeiten') setAbhaengigkeitenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'aufgaben') setAufgabenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'angebotsuebernahmen') setAngebotsuebernahmenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'entscheidungen') setEntscheidungenDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    beteiligte: {
      openCreate: (defaults?: BeteiligteDialogDefaults) => (perms.canWrite('beteiligte') ? setBeteiligteDialog({ defaults }) : refuse()),
      openEdit: (record: Beteiligte) => (perms.canWrite('beteiligte') ? setBeteiligteDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Beteiligte) => detailBeteiligte(record, false),
      canWrite: perms.canWrite('beteiligte'),
    },
    anforderungen: {
      openCreate: (defaults?: AnforderungenDialogDefaults) => (perms.canWrite('anforderungen') ? setAnforderungenDialog({ defaults }) : refuse()),
      openEdit: (record: Anforderungen) => (perms.canWrite('anforderungen') ? setAnforderungenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Anforderungen) => detailAnforderungen(record, false),
      canWrite: perms.canWrite('anforderungen'),
    },
    fachbeitraege: {
      openCreate: (defaults?: FachbeitraegeDialogDefaults) => (perms.canWrite('fachbeitraege') ? setFachbeitraegeDialog({ defaults }) : refuse()),
      openEdit: (record: Fachbeitraege) => (perms.canWrite('fachbeitraege') ? setFachbeitraegeDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Fachbeitraege) => detailFachbeitraege(record, false),
      canWrite: perms.canWrite('fachbeitraege'),
    },
    angebotsvorhaben: {
      openCreate: (defaults?: AngebotsvorhabenDialogDefaults) => (perms.canWrite('angebotsvorhaben') ? setAngebotsvorhabenDialog({ defaults }) : refuse()),
      openEdit: (record: Angebotsvorhaben) => (perms.canWrite('angebotsvorhaben') ? setAngebotsvorhabenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Angebotsvorhaben) => detailAngebotsvorhaben(record, false),
      canWrite: perms.canWrite('angebotsvorhaben'),
    },
    angebotsvarianten: {
      openCreate: (defaults?: AngebotsvariantenDialogDefaults) => (perms.canWrite('angebotsvarianten') ? setAngebotsvariantenDialog({ defaults }) : refuse()),
      openEdit: (record: Angebotsvarianten) => (perms.canWrite('angebotsvarianten') ? setAngebotsvariantenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Angebotsvarianten) => detailAngebotsvarianten(record, false),
      canWrite: perms.canWrite('angebotsvarianten'),
    },
    abhaengigkeiten: {
      openCreate: (defaults?: AbhaengigkeitenDialogDefaults) => (perms.canWrite('abhaengigkeiten') ? setAbhaengigkeitenDialog({ defaults }) : refuse()),
      openEdit: (record: Abhaengigkeiten) => (perms.canWrite('abhaengigkeiten') ? setAbhaengigkeitenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Abhaengigkeiten) => detailAbhaengigkeiten(record, false),
      canWrite: perms.canWrite('abhaengigkeiten'),
    },
    aufgaben: {
      openCreate: (defaults?: AufgabenDialogDefaults) => (perms.canWrite('aufgaben') ? setAufgabenDialog({ defaults }) : refuse()),
      openEdit: (record: Aufgaben) => (perms.canWrite('aufgaben') ? setAufgabenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Aufgaben) => detailAufgaben(record, false),
      canWrite: perms.canWrite('aufgaben'),
    },
    angebotsuebernahmen: {
      openCreate: (defaults?: AngebotsuebernahmenDialogDefaults) => (perms.canWrite('angebotsuebernahmen') ? setAngebotsuebernahmenDialog({ defaults }) : refuse()),
      openEdit: (record: Angebotsuebernahmen) => (perms.canWrite('angebotsuebernahmen') ? setAngebotsuebernahmenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Angebotsuebernahmen) => detailAngebotsuebernahmen(record, false),
      canWrite: perms.canWrite('angebotsuebernahmen'),
    },
    entscheidungen: {
      openCreate: (defaults?: EntscheidungenDialogDefaults) => (perms.canWrite('entscheidungen') ? setEntscheidungenDialog({ defaults }) : refuse()),
      openEdit: (record: Entscheidungen) => (perms.canWrite('entscheidungen') ? setEntscheidungenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Entscheidungen) => detailEntscheidungen(record, false),
      canWrite: perms.canWrite('entscheidungen'),
    },
    enriched: { beteiligte: data.beteiligte, anforderungen: enrichedAnforderungen, fachbeitraege: enrichedFachbeitraege, angebotsvorhaben: enrichedAngebotsvorhaben, angebotsvarianten: enrichedAngebotsvarianten, abhaengigkeiten: enrichedAbhaengigkeiten, aufgaben: enrichedAufgaben, angebotsuebernahmen: enrichedAngebotsuebernahmen, entscheidungen: enrichedEntscheidungen },
  };
}
