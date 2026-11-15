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
 *   beteiligte: entscheidungsgrenze, vorname, nachname, email, rolle, telefon, fachbereich, aktiv  ·  ← angebotsvorhaben (list + contextual +) · ← aufgaben (list + contextual +) · ← entscheidungen (list + contextual +)
 *   angebotsvorhaben: bezeichnung, kundenname, anfragenummer, eingangsdatum, abgabefrist, anfragebeschreibung, liefergegenstand, phase, …  ·  → beteiligte · ← angebotsvarianten (list + contextual +) · ← aufgaben (list + contextual +) · ← entscheidungen (list + contextual +)
 *   angebotsvarianten: angebotspreis, akzeptierte_risiken, vertragsbedingungen, status, herstellkosten, beschaffungskosten, aufwand_stunden, vorhaben, …  ·  → angebotsvorhaben
 *   aufgaben: titel, vorhaben, art, verantwortlicher, faelligkeit, status, ausloeser, fragestellung, …  ·  → angebotsvorhaben · → beteiligte · → aufgaben · ← entscheidungen (list + contextual +)
 *   entscheidungen: vorhaben, frage, ergebnis, begruendung, bedingungen, finanzielle_auswirkung, entscheider, entscheidungsdatum, …  ·  → angebotsvorhaben · → beteiligte · → aufgaben
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { Beteiligte, Angebotsvorhaben, Angebotsvarianten, Aufgaben, Entscheidungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { enrichAngebotsvorhaben, enrichAngebotsvarianten, enrichAufgaben, enrichEntscheidungen } from '@/lib/enrich';
import type { EnrichedAngebotsvorhaben, EnrichedAngebotsvarianten, EnrichedAufgaben, EnrichedEntscheidungen } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { BeteiligteDialog, type BeteiligteDialogDefaults } from '@/components/dialogs/BeteiligteDialog';
import { BeteiligteDetails } from '@/components/details/BeteiligteDetails';
import { AngebotsvorhabenDialog, type AngebotsvorhabenDialogDefaults } from '@/components/dialogs/AngebotsvorhabenDialog';
import { AngebotsvorhabenDetails } from '@/components/details/AngebotsvorhabenDetails';
import { AngebotsvariantenDialog, type AngebotsvariantenDialogDefaults } from '@/components/dialogs/AngebotsvariantenDialog';
import { AngebotsvariantenDetails } from '@/components/details/AngebotsvariantenDetails';
import { AufgabenDialog, type AufgabenDialogDefaults } from '@/components/dialogs/AufgabenDialog';
import { AufgabenDetails } from '@/components/details/AufgabenDetails';
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
  | { type: 'angebotsvorhaben'; record: EnrichedAngebotsvorhaben }
  | { type: 'angebotsvarianten'; record: EnrichedAngebotsvarianten }
  | { type: 'aufgaben'; record: EnrichedAufgaben }
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
  angebotsvorhaben: EntityCrudApi<Angebotsvorhaben, AngebotsvorhabenDialogDefaults>;
  angebotsvarianten: EntityCrudApi<Angebotsvarianten, AngebotsvariantenDialogDefaults>;
  aufgaben: EntityCrudApi<Aufgaben, AufgabenDialogDefaults>;
  entscheidungen: EntityCrudApi<Entscheidungen, EntscheidungenDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { beteiligte: Beteiligte[]; angebotsvorhaben: EnrichedAngebotsvorhaben[]; angebotsvarianten: EnrichedAngebotsvarianten[]; aufgaben: EnrichedAufgaben[]; entscheidungen: EnrichedEntscheidungen[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  // the platform's rights of the signed-in user (lib/permissions.ts) — unknown = allowed
  const perms = usePermissions();
  const refuse = () => { toast.error(t('perm_denied_title'), { description: t('perm_denied_desc') }); };
  const [beteiligteDialog, setBeteiligteDialog] = useState<{ defaults?: BeteiligteDialogDefaults; editing?: Beteiligte } | null>(null);
  const [angebotsvorhabenDialog, setAngebotsvorhabenDialog] = useState<{ defaults?: AngebotsvorhabenDialogDefaults; editing?: Angebotsvorhaben } | null>(null);
  const [angebotsvariantenDialog, setAngebotsvariantenDialog] = useState<{ defaults?: AngebotsvariantenDialogDefaults; editing?: Angebotsvarianten } | null>(null);
  const [aufgabenDialog, setAufgabenDialog] = useState<{ defaults?: AufgabenDialogDefaults; editing?: Aufgaben } | null>(null);
  const [entscheidungenDialog, setEntscheidungenDialog] = useState<{ defaults?: EntscheidungenDialogDefaults; editing?: Entscheidungen } | null>(null);
  const enrichedAngebotsvorhaben = useMemo(() => enrichAngebotsvorhaben(data.angebotsvorhaben, { beteiligteMap: data.beteiligteMap }), [data.angebotsvorhaben, data.beteiligteMap]);
  const enrichedAngebotsvarianten = useMemo(() => enrichAngebotsvarianten(data.angebotsvarianten, { angebotsvorhabenMap: data.angebotsvorhabenMap }), [data.angebotsvarianten, data.angebotsvorhabenMap]);
  const enrichedAufgaben = useMemo(() => enrichAufgaben(data.aufgaben, { angebotsvorhabenMap: data.angebotsvorhabenMap, beteiligteMap: data.beteiligteMap, aufgabenMap: data.aufgabenMap }), [data.aufgaben, data.angebotsvorhabenMap, data.beteiligteMap, data.aufgabenMap]);
  const enrichedEntscheidungen = useMemo(() => enrichEntscheidungen(data.entscheidungen, { angebotsvorhabenMap: data.angebotsvorhabenMap, beteiligteMap: data.beteiligteMap, aufgabenMap: data.aufgabenMap }), [data.entscheidungen, data.angebotsvorhabenMap, data.beteiligteMap, data.aufgabenMap]);

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
        angebotsvorhabenList={data.angebotsvorhaben}
        enablePhotoScan={AI_PHOTO_SCAN['Angebotsvarianten']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Angebotsvarianten']}
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
      <EntscheidungenDialog
        open={entscheidungenDialog !== null}
        onClose={() => setEntscheidungenDialog(null)}
        onSubmit={submitEntscheidungen}
        defaultValues={entscheidungenDialog?.defaults}
        recordId={entscheidungenDialog?.editing?.record_id}
        angebotsvorhabenList={data.angebotsvorhaben}
        beteiligteList={data.beteiligte}
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
                  angebotsvorhabenList={data.angebotsvorhaben}
                  onOpenAngebotsvorhaben={(r) => detailAngebotsvorhaben(r, true)}
                  onAddAngebotsvorhaben={perms.canWrite('angebotsvorhaben') ? () => setAngebotsvorhabenDialog({ defaults: { projektleitung: createRecordUrl(APP_IDS.BETEILIGTE, top.record.record_id) } }) : undefined}
                  aufgabenList={data.aufgaben}
                  onOpenAufgaben={(r) => detailAufgaben(r, true)}
                  onAddAufgaben={perms.canWrite('aufgaben') ? () => setAufgabenDialog({ defaults: { verantwortlicher: createRecordUrl(APP_IDS.BETEILIGTE, top.record.record_id) } }) : undefined}
                  entscheidungenList={data.entscheidungen}
                  onOpenEntscheidungen={(r) => detailEntscheidungen(r, true)}
                  onAddEntscheidungen={perms.canWrite('entscheidungen') ? () => setEntscheidungenDialog({ defaults: { entscheider: createRecordUrl(APP_IDS.BETEILIGTE, top.record.record_id) } }) : undefined}
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
                  angebotsvariantenList={data.angebotsvarianten}
                  onOpenAngebotsvarianten={(r) => detailAngebotsvarianten(r, true)}
                  onAddAngebotsvarianten={perms.canWrite('angebotsvarianten') ? () => setAngebotsvariantenDialog({ defaults: { vorhaben: createRecordUrl(APP_IDS.ANGEBOTSVORHABEN, top.record.record_id) } }) : undefined}
                  aufgabenList={data.aufgaben}
                  onOpenAufgaben={(r) => detailAufgaben(r, true)}
                  onAddAufgaben={perms.canWrite('aufgaben') ? () => setAufgabenDialog({ defaults: { vorhaben: createRecordUrl(APP_IDS.ANGEBOTSVORHABEN, top.record.record_id) } }) : undefined}
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
                  angebotsvorhabenList={data.angebotsvorhaben}
                  onOpenAngebotsvorhaben={(r) => detailAngebotsvorhaben(r, true)}
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
                  entscheidungenList={data.entscheidungen}
                  onOpenEntscheidungen={(r) => detailEntscheidungen(r, true)}
                  onAddEntscheidungen={perms.canWrite('entscheidungen') ? () => setEntscheidungenDialog({ defaults: { aufgabe: createRecordUrl(APP_IDS.AUFGABEN, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'entscheidungen') {
            return (
              <>
                <RecordHeader title={displayNameOf('entscheidungen', top.record.fields as Record<string, unknown>) || appLabel('entscheidungen')} subtitle={top.record.fields.entscheidungsdatum ? formatDate(top.record.fields.entscheidungsdatum) : undefined} />
                <EntscheidungenDetails
                  record={top.record}
                  angebotsvorhabenList={data.angebotsvorhaben}
                  onOpenAngebotsvorhaben={(r) => detailAngebotsvorhaben(r, true)}
                  beteiligteList={data.beteiligte}
                  onOpenBeteiligte={(r) => detailBeteiligte(r, true)}
                  aufgabenList={data.aufgaben}
                  onOpenAufgaben={(r) => detailAufgaben(r, true)}
                />
              </>
            );
          }
          return null;
        }}
        canEdit={(top) => {
          if (top.type === 'beteiligte') return perms.canWrite('beteiligte');
          if (top.type === 'angebotsvorhaben') return perms.canWrite('angebotsvorhaben');
          if (top.type === 'angebotsvarianten') return perms.canWrite('angebotsvarianten');
          if (top.type === 'aufgaben') return perms.canWrite('aufgaben');
          if (top.type === 'entscheidungen') return perms.canWrite('entscheidungen');
          return true;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'beteiligte') setBeteiligteDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'angebotsvorhaben') setAngebotsvorhabenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'angebotsvarianten') setAngebotsvariantenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'aufgaben') setAufgabenDialog({ editing: top.record, defaults: top.record.fields });
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
    aufgaben: {
      openCreate: (defaults?: AufgabenDialogDefaults) => (perms.canWrite('aufgaben') ? setAufgabenDialog({ defaults }) : refuse()),
      openEdit: (record: Aufgaben) => (perms.canWrite('aufgaben') ? setAufgabenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Aufgaben) => detailAufgaben(record, false),
      canWrite: perms.canWrite('aufgaben'),
    },
    entscheidungen: {
      openCreate: (defaults?: EntscheidungenDialogDefaults) => (perms.canWrite('entscheidungen') ? setEntscheidungenDialog({ defaults }) : refuse()),
      openEdit: (record: Entscheidungen) => (perms.canWrite('entscheidungen') ? setEntscheidungenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Entscheidungen) => detailEntscheidungen(record, false),
      canWrite: perms.canWrite('entscheidungen'),
    },
    enriched: { beteiligte: data.beteiligte, angebotsvorhaben: enrichedAngebotsvorhaben, angebotsvarianten: enrichedAngebotsvarianten, aufgaben: enrichedAufgaben, entscheidungen: enrichedEntscheidungen },
  };
}
