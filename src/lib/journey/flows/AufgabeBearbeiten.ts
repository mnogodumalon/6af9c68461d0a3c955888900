/**
 * useAufgabeBearbeitenFlow — the plumbing of the flow « Aufgabe bearbeiten », generated from the plan.
 *
 * Changes `aufgaben`: the record to change is picked (`flow.pick('aufgaben')`), the form is prefilled with its values; asks `ergebnis`, `status`, `folgeaufgabe_noetig`, `folgeaufgabe_hinweis`.
Writes `aufgaben` (only when the person fills it) SEVERAL times — one record per entry of `flow.lists.aufgaben2`; the form is the editor of one entry: asks `vorhaben`, `titel`, `art`, `verantwortlicher`, `faelligkeit`, `fragestellung`, `ausloesende_aufgabe`; sets `ausloeser`, `status` itself.
 * The hook OWNS: the form(s) with exactly these fields and the plan's required
 * ingredients, one record search per picked field (columns and filter from
 * the plan), and the submit plan with its fixed and derived values. A page
 * that only calls `flow.submit.run()` cannot write a field the plan does not
 * know — there is no way to spell it.
 *
 * YOU decide what a person notices, through the options:
 *   steps     which wizard step asks which field (default: one step per pick,
 *             then one for the typed fields, then "Prüfen" = step 7)
 *   items     how a search hit is displayed per pick (title, subtitle, status …)
 *   initial   prefills for typed fields
 *   messages  the sentence for an empty required field, per field
 *
 *   Lists (several records of one entity per run): `flow.lists.<key>` holds the
 *   entries — `add()` validates the editor form and takes its values as one more
 *   record, `remove(id)`, `edit(id)` (back into the editor), `entries`, `count`.
 *   Render the editor's fields INSIDE <ListEntries list={flow.lists.<key>}> (the
 *   block adds „Hinzufügen“ and the entry list); „Weiter“ on that step takes a
 *   filled editor as one more entry and needs at least one entry.
 *
 *   const flow = useAufgabeBearbeitenFlow({
 *     steps: { aufgaben: 1, vorhaben: 2, verantwortlicher: 3, ausloesende_aufgabe: 4, ergebnis: 5, status: 5, folgeaufgabe_noetig: 5, folgeaufgabe_hinweis: 5, titel: 6, art: 6, faelligkeit: 6, fragestellung: 6 },
 *     items: { aufgaben: r => ({ id: r.id, title: fieldText(r, 'titel') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     // the record this flow changes: <EntitySelectStep {...flow.picks.aufgaben.select} {...flow.pick('aufgaben')} />
 *     <EntitySelectStep {...flow.picks.vorhaben.select} {...flow.pick('vorhaben')} />
 *     <EntitySelectStep {...flow.picks.verantwortlicher.select} {...flow.pick('verantwortlicher')} />
 *     <EntitySelectStep {...flow.picks.ausloesende_aufgabe.select} {...flow.pick('ausloesende_aufgabe')} />
 *     <Bound form={flow.forms.aufgaben} name="ergebnis" />
 *     <Bound form={flow.forms.aufgaben} name="status" />
 *     <Bound form={flow.forms.aufgaben} name="folgeaufgabe_noetig" />
 *     <Bound form={flow.forms.aufgaben} name="folgeaufgabe_hinweis" />
 *     <ListEntries list={flow.lists.aufgaben2}><Bound form={flow.forms.aufgaben2} name="titel" /><Bound form={flow.forms.aufgaben2} name="art" /><Bound form={flow.forms.aufgaben2} name="faelligkeit" /><Bound form={flow.forms.aufgaben2} name="fragestellung" /></ListEntries>
 *     <StepNav onNext={() => flow.validateStep(n)} />
 *     {!flow.submit.done && <SummaryStep forms={flow.formList} submit={flow.submit} variants={flow.actions} />}
 *     {flow.submit.result && <SuccessStep result={flow.submit.result} forms={flow.formList} submit={flow.submit} undo={flow.undo} />}
 *   </IntentWizardShell>
 */
import { useEffect, useRef, useState } from 'react';
import { readJourneyExtra, writeJourneyExtra } from '@/lib/journey/draft';
import { nounOne } from '@/config/plan';
import {
  useStepForm, useJourneySubmit, useRecordSearch,
  fieldText, fieldLookup, fieldLookups, fieldNumber, fieldDate, fieldRef,
  todayIso, nowIso, isEmptyValue, policyFixedValue, withPickPolicy, usePolicyVersion, refFilter, combineFilters,  type StepForm, type JourneyRecord, type RefContext, type SelectItemLike, type FormValues, type PlanStep, type SummaryItem,} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { requestWizardStep } from '@/lib/journey/useStepForm';
import { reportReadFailure } from '@/lib/journey/readFailures';
import { pickHint, whereSentence, type PickWhere } from '@/lib/journey/policy';
import { labelOf, optionsOf, type EntityKey } from '@/lib/journey/rules';
import { entityLabel } from '@/lib/journey/rules';

export type AufgabeBearbeitenFieldKey = 'art' | 'aufgaben' | 'ausloesende_aufgabe' | 'ergebnis' | 'faelligkeit' | 'folgeaufgabe_hinweis' | 'folgeaufgabe_noetig' | 'fragestellung' | 'status' | 'titel' | 'verantwortlicher' | 'vorhaben';

export interface AufgabeBearbeitenForms {
  aufgaben: StepForm<'aufgaben'>;
  aufgaben2: StepForm<'aufgaben'>;
}

// Alias so the option generics stay readable.
type Key = AufgabeBearbeitenFieldKey;

export interface AufgabeBearbeitenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    aufgaben?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    vorhaben?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    verantwortlicher?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    ausloesende_aufgabe?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
  /** A page-side narrowing per pick, on top of the plan's filter (J-3): the
   *  questions of the picked event, the open ones — `r => fieldRef(r, 'veranstaltung') === eventId`. */
  where?: {
    aufgaben?: (record: JourneyRecord) => boolean;
    vorhaben?: (record: JourneyRecord) => boolean;
    verantwortlicher?: (record: JourneyRecord) => boolean;
    ausloesende_aufgabe?: (record: JourneyRecord) => boolean;
  };
}

/** One entry of a list the flow creates several records from (`flow.lists.<key>`). */
export interface ListEntry { id: string; values: FormValues; labels: Record<string, string>; rows: SummaryItem[] }

const DEFAULT_STEPS: Record<string, number> = {"art": 6, "aufgaben": 1, "ausloesende_aufgabe": 4, "ergebnis": 5, "faelligkeit": 6, "folgeaufgabe_hinweis": 5, "folgeaufgabe_noetig": 5, "fragestellung": 6, "status": 5, "titel": 6, "verantwortlicher": 3, "vorhaben": 2};
export const AUFGABEBEARBEITEN_REVIEW_STEP = 7;
// a label of the plan in the page's language
function labelIn(m: Record<string, string>): string {
  const l = (typeof document !== 'undefined' ? document.documentElement.lang : '') || 'de';
  return m[l.slice(0, 2)] ?? m.de ?? Object.values(m)[0] ?? '';
}
// the ways this flow may END (plan: success.actions) — the review shows one
// button per entry, the chosen one sets these values on the primary record
const ACTION_SETS: Record<string, FormValues> = { 'erledigt-speichern': {"status": "erledigt"}, 'wartet-speichern': {"status": "wartet"} };
// the counter-action (plan: undo) — what puts the changed record back
const UNDO_SETS: Record<string, unknown> = {"status": "aktiv"};

function fromPick<T>(pick: { recordOf(id: string): JourneyRecord | undefined }, form: StepForm, field: string, read: (r: JourneyRecord) => T): T | undefined {
  const id = form.get(field);
  const rec = typeof id === 'string' && id ? pick.recordOf(id) : undefined;
  return rec ? read(rec) : undefined;
}
// local calendar day — the ISO-string of a Date is UTC and flips the date in the evening (J-7)
function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Returns T, not Partial<T>: a Record's index signature is already "maybe
// absent", and Partial<Record<string, string>> does not assign to the
// Record<string, string> useStepForm wants (tsc, live 23.09.2026 — eight
// errors, one per hook, caught only in the sandbox build).
function only<T extends Record<string, unknown>>(obj: T | undefined, keys: string[]): T | undefined {
  if (!obj) return undefined;
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out as T;
}

function hasValues(form: StepForm): boolean {
  return form.keys.some(k => !isEmptyValue(form.values[k]));
}
// The picked record as `?record=<id>` in the address — a reload or a shared
// address opens the flow on the same record (J-8). replaceState: no navigation.
function mirrorRecordParam(id: string | null): void {
  try {
    const [base, query = ''] = window.location.hash.split('?');
    const q = new URLSearchParams(query);
    if (id) q.set('record', id); else q.delete('record');
    const qs = q.toString();
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${base}${qs ? `?${qs}` : ''}`);
  } catch {
    /* ignore */
  }
}

export function useAufgabeBearbeitenFlow(options: AufgabeBearbeitenFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const variantRef = useRef<string | null>(null);   // the end action the person chose (PV-14)
  const [aufgabenTargetId, setAufgabenTargetId] = useState<string | null>(null);
  const aufgaben = useStepForm('aufgaben', {
    fields: ["ergebnis", "status", "folgeaufgabe_noetig", "folgeaufgabe_hinweis"],
    steps: only(steps, ["ergebnis", "status", "folgeaufgabe_noetig", "folgeaufgabe_hinweis"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["ergebnis", "status", "folgeaufgabe_noetig", "folgeaufgabe_hinweis"]),
    messages: only(options.messages as Record<string, string> | undefined, ["ergebnis", "status", "folgeaufgabe_noetig", "folgeaufgabe_hinweis"]),
  });
  const aufgaben2 = useStepForm('aufgaben', {
    fields: ["vorhaben", "titel", "art", "verantwortlicher", "faelligkeit", "fragestellung", "ausloesende_aufgabe"],
    steps: only(steps, ["vorhaben", "titel", "art", "verantwortlicher", "faelligkeit", "fragestellung", "ausloesende_aufgabe"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["vorhaben", "titel", "art", "verantwortlicher", "faelligkeit", "fragestellung", "ausloesende_aufgabe"]),
    messages: only(options.messages as Record<string, string> | undefined, ["vorhaben", "titel", "art", "verantwortlicher", "faelligkeit", "fragestellung", "ausloesende_aufgabe"]),
  });
  const [aufgaben2Entries, setAufgaben2Entries] = useState<ListEntry[]>(() => readJourneyExtra<ListEntry[]>('aufgabe-bearbeiten', 'list:aufgaben2') ?? []);
  useEffect(() => { writeJourneyExtra('aufgabe-bearbeiten', 'list:aufgaben2', aufgaben2Entries.length ? aufgaben2Entries : null); }, [aufgaben2Entries]);
  const forms: AufgabeBearbeitenForms = { aufgaben, aufgaben2 };
  // the editor of a list is not a record of its own: the review and the success
  // page read the entries (PlanStep.review), never the half-filled editor
  const formList: StepForm[] = [aufgaben];
  const allForms: StepForm[] = [aufgaben, aufgaben2];
  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  // a pick that belongs to another pick's record (A9): server filter + its client twin
  const dependsOn = (dep: unknown, field: string) => (typeof dep === 'string' && /^[a-f0-9]{24}$/i.test(dep) ? refFilter(field, dep) : undefined);
  const dependsWhere = (r: JourneyRecord, field: string, dep: unknown) => typeof dep !== 'string' || dep === '' || fieldRef(r, field) === dep;
  const searches = {
    aufgaben: useRecordSearch(servicePort, 'aufgaben', withPickPolicy('aufgaben', {
      searchFields: ["titel"] as never,
      // only the aufgaben of the vorhaben picked before
      filter: combineFilters("r.v_status in ['geplant', 'aktiv', 'wartet']", dependsOn(aufgaben2.get("vorhaben"), 'vorhaben')),
      where: (r: JourneyRecord) => (["geplant", "aktiv", "wartet"].includes(fieldLookup(r, "status")?.key ?? '')) && dependsWhere(r, 'vorhaben', aufgaben2.get("vorhaben")) && (options.where?.aufgaben?.(r) ?? true),
      toItem: options.items?.aufgaben as never,
      includeTaken: true,
    })),
    vorhaben: useRecordSearch(servicePort, 'angebotsvorhaben', withPickPolicy('vorhaben', {
      searchFields: ["bezeichnung"] as never,
      // only the angebotsvorhaben of the verantwortlicher picked before
      filter: combineFilters(undefined, dependsOn(aufgaben2.get("verantwortlicher"), 'projektleitung')),
      where: (r: JourneyRecord) => (true) && dependsWhere(r, 'projektleitung', aufgaben2.get("verantwortlicher")) && (options.where?.vorhaben?.(r) ?? true),
      toItem: options.items?.vorhaben as never,
      claim: 'aufgaben.vorhaben',
    })),
    verantwortlicher: useRecordSearch(servicePort, 'beteiligte', withPickPolicy('verantwortlicher', {
      searchFields: ["vorname", "nachname"] as never,
      filter: "r.v_aktiv == True",
      where: (r: JourneyRecord) => (r.fields["aktiv"] === true) && (options.where?.verantwortlicher?.(r) ?? true),
      toItem: options.items?.verantwortlicher as never,
      claim: 'aufgaben.verantwortlicher',
    })),
    ausloesende_aufgabe: useRecordSearch(servicePort, 'aufgaben', withPickPolicy('ausloesende_aufgabe', {
      searchFields: ["titel"] as never,
      // only the aufgaben of the vorhaben picked before
      filter: combineFilters("r.v_status in ['geplant', 'aktiv', 'wartet']", dependsOn(aufgaben2.get("vorhaben"), 'vorhaben')),
      where: (r: JourneyRecord) => (["geplant", "aktiv", "wartet"].includes(fieldLookup(r, "status")?.key ?? '')) && dependsWhere(r, 'vorhaben', aufgaben2.get("vorhaben")) && (options.where?.ausloesende_aufgabe?.(r) ?? true),
      toItem: options.items?.ausloesende_aufgabe as never,
      claim: 'aufgaben.ausloesende_aufgabe',
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:aufgabe-bearbeiten:read:${entity}`);
  // a fixed value the flow sets itself, as a review row with the link that changes it
  const setting = (entity: EntityKey, field: string, value: unknown): SummaryItem => ({
    key: `setting:${entity}.${field}`, label: labelOf(entity, field),
    value: optionsOf(entity, field).find(o => o.key === String(value))?.label ?? String(value ?? ''),
    href: `#/verwaltung/anwendung?line=intent:aufgabe-bearbeiten:write:${entity}.${field}`,
  });
  const picks = {
    aufgaben: { ...searches.aufgaben, select: { ...searches.aufgaben.select, create: false as boolean, hint: hintFor('aufgaben', 'aufgaben', {"conditions": [{"field": "status", "op": "in", "value": ["geplant", "aktiv", "wartet"]}], "mode": "all"} as PickWhere | null) } },
    vorhaben: { ...searches.vorhaben, select: { ...searches.vorhaben.select, create: false as boolean, hint: hintFor('vorhaben', 'angebotsvorhaben', null as PickWhere | null) } },
    verantwortlicher: { ...searches.verantwortlicher, select: { ...searches.verantwortlicher.select, create: false as boolean, hint: hintFor('verantwortlicher', 'beteiligte', {"conditions": [{"field": "aktiv", "op": "eq", "value": "true"}], "mode": "all"} as PickWhere | null) } },
    ausloesende_aufgabe: { ...searches.ausloesende_aufgabe, select: { ...searches.ausloesende_aufgabe.select, create: false as boolean, hint: hintFor('ausloesende_aufgabe', 'aufgaben', {"conditions": [{"field": "status", "op": "in", "value": ["geplant", "aktiv", "wartet"]}], "mode": "all"} as PickWhere | null) } },
  };

  const aufgaben2Filled = hasValues(aufgaben2);
  // Lists — several records of one entity in one run („ein paar Termine“): the
  // editor form takes one entry at a time, `add()` validates it and puts it on
  // the list, the plan creates one record per entry (02.11.2026: the wish said
  // several, the flow made exactly one and nobody reported the difference)
  const lists = {
    aufgaben2: {
      entries: aufgaben2Entries,
      count: aufgaben2Entries.length,
      label: nounOne('aufgaben', entityLabel('aufgaben')),
      /** Validates the editor and takes its values as one more `aufgaben`; false when a required field is empty. */
      add: (): boolean => {
        if (!aufgaben2.validate()) return false;
        const rows = aufgaben2.summary().filter(r => r.value !== '—');
        const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        // the snapshot is taken HERE, never inside the updater: React may run the updater in the
        // next render, after reset() below emptied the editor — and payload() reads the latest
        // values (EF-38), so every entry arrived without its dates (EF-41, Doodle KB 5)
        const values = aufgaben2.payload();
        const labels = { ...aufgaben2.labels };
        setAufgaben2Entries(list => [...list, { id, values, labels, rows }]);
        aufgaben2.reset();
        return true;
      },
      remove: (id: string) => setAufgaben2Entries(list => list.filter(e => e.id !== id)),
      /** Takes an entry back into the editor to change it. */
      edit: (id: string) => {
        const e = aufgaben2Entries.find(x => x.id === id);
        if (!e) return;
        setAufgaben2Entries(list => list.filter(x => x.id !== id));
        aufgaben2.reset(e.values, e.labels);
      },
    },
  };
  const plan: PlanStep[] = [
    {
      key: 'aufgaben', entity: 'aufgaben', form: aufgaben, label: nounOne('aufgaben', entityLabel('aufgaben')), primary: true,
      updates: () => aufgabenTargetId ?? undefined,
      // the review names the record this step changes; "Ändern" leads back to its pick
      target: () => aufgabenTargetId
        ? { key: 'target:aufgaben', label: nounOne('aufgaben', entityLabel('aufgaben')), value: picks.aufgaben.labelOf(aufgabenTargetId) ?? aufgabenTargetId, step: steps.aufgaben }
        : undefined,
      values: (): FormValues => ({
        ...(variantRef.current ? ACTION_SETS[variantRef.current] ?? {} : {}),
      }),
    },
    ...aufgaben2Entries.map((entry, i) => ({
      key: `aufgaben2:${entry.id}`, entity: 'aufgaben', label: `${nounOne('aufgaben', entityLabel('aufgaben'))} ${i + 1}`,
      values: (): FormValues => ({
        ...entry.values,
        ausloeser: policyFixedValue('aufgaben', 'ausloeser') ?? "folge",
        status: policyFixedValue('aufgaben', 'status') ?? "geplant",
      }),
      // the review lists every entry („1. Termin: …“); „Ändern“ leads back to the list's step
      review: () => entry.rows.map(r => ({ ...r, key: `aufgaben2:${entry.id}:${r.key}`, label: `${i + 1}. ${r.label}`, step: steps[r.key] })),
    } as PlanStep)),
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'aufgabe-bearbeiten' });

  // A typed field the plan prefills from the picked record (`user:from_pick`),
  // still the person's to change: filled once, only while empty (PV-12)
  const prefillFrom = (pickKey: string, rec: JourneyRecord) => {
    if (pickKey === 'ausloesende_aufgabe' && isEmptyValue(forms.aufgaben2.get('fragestellung'))) (forms.aufgaben2.set as (k: string, v: unknown) => void)('fragestellung', fieldText(rec, 'folgeaufgabe_hinweis') ?? '');
    void pickKey; void rec;
  };

  // Opened with `?<field>=<value>` for a field this flow asks — a dashboard
  // link that pre-picks the event, a form that hands the question on (J-2):
  // a typed field takes the value while it is empty (a draft wins), a pick
  // loads the record, takes it into the pick and selects it WITH its name.
  // `initial` with a bare record id gets its name the same way.
  const [linkedParams] = useState(() => new URLSearchParams(window.location.hash.split('?')[1] ?? ''));
  useEffect(() => {
    let on = true;
    const coerce = (form: StepForm, key: string, raw: string): unknown => {
      const kind = form.rules[key]?.kind;
      if (kind === 'number') { const n = Number(raw); return Number.isFinite(n) ? n : raw; }
      if (kind === 'bool') return raw === 'true' || raw === '1' || raw === 'ja';
      return raw;
    };
    { const v = linkedParams.get('ergebnis'); if (v !== null && isEmptyValue(aufgaben.get('ergebnis'))) (aufgaben.set as (k: string, v: unknown) => void)('ergebnis', coerce(aufgaben, 'ergebnis', v)); }
    { const v = linkedParams.get('status'); if (v !== null && isEmptyValue(aufgaben.get('status'))) (aufgaben.set as (k: string, v: unknown) => void)('status', coerce(aufgaben, 'status', v)); }
    { const v = linkedParams.get('folgeaufgabe_noetig'); if (v !== null && isEmptyValue(aufgaben.get('folgeaufgabe_noetig'))) (aufgaben.set as (k: string, v: unknown) => void)('folgeaufgabe_noetig', coerce(aufgaben, 'folgeaufgabe_noetig', v)); }
    { const v = linkedParams.get('folgeaufgabe_hinweis'); if (v !== null && isEmptyValue(aufgaben.get('folgeaufgabe_hinweis'))) (aufgaben.set as (k: string, v: unknown) => void)('folgeaufgabe_hinweis', coerce(aufgaben, 'folgeaufgabe_hinweis', v)); }
    {
      const cur = forms.aufgaben2.get('vorhaben');
      const fromLink = linkedParams.get('vorhaben');
      const unnamed = typeof cur === 'string' && cur !== '' && !forms.aufgaben2.labels[cur] ? cur : null;
      const id = fromLink && isEmptyValue(cur) ? fromLink : unnamed;
      if (id) void servicePort.get('angebotsvorhaben', id).then(rec => {
        if (!on || !rec) return;
        picks.vorhaben.adopt(rec);
        const name = picks.vorhaben.labelOf(rec.id) ?? rec.id;
        (forms.aufgaben2.set as (k: string, v: unknown, l?: string) => void)('vorhaben', rec.id, name);
        prefillFrom('vorhaben', rec);
      }).catch(() => undefined);
    }
    {
      const cur = forms.aufgaben2.get('verantwortlicher');
      const fromLink = linkedParams.get('verantwortlicher');
      const unnamed = typeof cur === 'string' && cur !== '' && !forms.aufgaben2.labels[cur] ? cur : null;
      const id = fromLink && isEmptyValue(cur) ? fromLink : unnamed;
      if (id) void servicePort.get('beteiligte', id).then(rec => {
        if (!on || !rec) return;
        picks.verantwortlicher.adopt(rec);
        const name = picks.verantwortlicher.labelOf(rec.id) ?? rec.id;
        (forms.aufgaben2.set as (k: string, v: unknown, l?: string) => void)('verantwortlicher', rec.id, name);
        prefillFrom('verantwortlicher', rec);
      }).catch(() => undefined);
    }
    {
      const cur = forms.aufgaben2.get('ausloesende_aufgabe');
      const fromLink = linkedParams.get('ausloesende_aufgabe');
      const unnamed = typeof cur === 'string' && cur !== '' && !forms.aufgaben2.labels[cur] ? cur : null;
      const id = fromLink && isEmptyValue(cur) ? fromLink : unnamed;
      if (id) void servicePort.get('aufgaben', id).then(rec => {
        if (!on || !rec) return;
        picks.ausloesende_aufgabe.adopt(rec);
        const name = picks.ausloesende_aufgabe.labelOf(rec.id) ?? rec.id;
        (forms.aufgaben2.set as (k: string, v: unknown, l?: string) => void)('ausloesende_aufgabe', rec.id, name);
        prefillFrom('ausloesende_aufgabe', rec);
      }).catch(() => undefined);
    }
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per link
  }, []);

  /** The record(s) this flow CHANGES: picked through {...flow.picks.<entity>.select} {...flow.pick('<entity>')};
   *  picking prefills the form with the record's current values, and the plan step updates that record. */
  const targets = {
    aufgaben: {
      selectedId: aufgabenTargetId,
      onSelect: (id: string) => {
        setAufgabenTargetId(id);
        const rec = picks.aufgaben.recordOf(id);
        if (rec) aufgaben.reset({ ergebnis: fieldText(rec, "ergebnis"), status: fieldLookup(rec, "status")?.key, folgeaufgabe_noetig: rec.fields["folgeaufgabe_noetig"] === true, folgeaufgabe_hinweis: fieldText(rec, "folgeaufgabe_hinweis"), });
        // survives a reload: in the draft's side data, and as `?record=` in the address (J-8)
        writeJourneyExtra('aufgabe-bearbeiten', 'target:aufgaben', id);
        mirrorRecordParam(id);
      },
      get record(): JourneyRecord | undefined { return aufgabenTargetId ? picks.aufgaben.recordOf(aufgabenTargetId) : undefined; },
    },
  };
  // Opened for one record — `#/intents/aufgabe-bearbeiten?record=<id>`, the dashboard's
  // flowActionFor(): that record is the one to change. Loaded, taken into the
  // pick and selected — when this flow may change it at all (the pick's rule).
  // After a reload the pick comes back the same way: from the address, else
  // from the draft's side data (J-8).
  const [linkedId] = useState(() => new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('record')
    ?? readJourneyExtra<string>('aufgabe-bearbeiten', 'target:aufgaben'));
  useEffect(() => {
    if (!linkedId) return;
    let on = true;
    void servicePort.get('aufgaben', linkedId).then(rec => {
      if (!on || !rec || !((r: JourneyRecord) => ["geplant", "aktiv", "wartet"].includes(fieldLookup(r, "status")?.key ?? ''))(rec)) return;
      reportReadFailure('aufgabe-bearbeiten:linked', null);
      picks.aufgaben.adopt(rec);
      targets.aufgaben.onSelect(rec.id);
      // the link named the record — start after the steps that pick it, without the start screen
      const after = Math.max(...Object.keys(targets).map(k => steps[k] ?? 1)) + 1;
      if (new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('record') === linkedId) requestWizardStep(after);
    }).catch(() => { if (on) reportReadFailure('aufgabe-bearbeiten:linked', 'aufgaben'); });
    return () => { on = false; reportReadFailure('aufgabe-bearbeiten:linked', null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per link
  }, [linkedId]);
  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: AufgabeBearbeitenFieldKey) => {
    if (field in targets) {
      const t = targets[field as keyof typeof targets];
      return { selectedId: t.selectedId, onSelect: t.onSelect };
    }
    const owner = allForms.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined; recordOf?(id: string): JourneyRecord | undefined }>)[field];
    return {
      selectedId: (typeof owner.get(field) === 'string' ? (owner.get(field) as string) : null) || null,
      // `field as never` collapsed the conditional SetArgs<E, never> to never and
      // no argument was assignable any more (tsc, live 23.09.2026); widen `set`
      // itself instead — the label stays a required third argument.
      onSelect: (id: string) => {
        (owner.set as (k: string, v: unknown, l?: string) => void)(field, id, search?.labelOf(id));
        const rec = search?.recordOf?.(id);
        if (rec) prefillFrom(field, rec);
      },
    };
  };
  /** Props for a multi-record pick step: {...flow.picks.x.select} {...flow.pickMany('x')} */
  const pickMany = (field: AufgabeBearbeitenFieldKey) => {
    const owner = allForms.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)))    // the list's step: a filled editor is taken as one more entry; at least one entry is needed
    && (steps['vorhaben'] !== n || (hasValues(aufgaben2) ? lists.aufgaben2.add() : aufgaben2Entries.length > 0 || aufgaben2.validate()))    && Object.entries(targets).every(([k, t]) => steps[k] !== n || !!t.selectedId);
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); aufgaben2.reset(); setAufgaben2Entries([]); setAufgabenTargetId(null); writeJourneyExtra('aufgabe-bearbeiten', 'target:aufgaben', null); mirrorRecordParam(null); };

  /** The ways this flow may end — spread as `variants={flow.actions}` onto <SummaryStep> (PV-14). */
  const flowActions = [
    { id: 'erledigt-speichern', label: labelIn({"de": "Als erledigt speichern", "en": "Save as done"}), confirm: () => { variantRef.current = 'erledigt-speichern'; return submit.run(); } },
    { id: 'wartet-speichern', label: labelIn({"de": "Speichern, wartet auf Antwort", "en": "Save, waiting for reply"}), confirm: () => { variantRef.current = 'wartet-speichern'; return submit.run(); } },
  ];
  /** The counter-action of the changed record — `undo={flow.undo}` on <SuccessStep> (PV-15). */
  const flowUndo = aufgabenTargetId
    ? { label: labelIn({"de": "Aufgabe wieder \u00f6ffnen", "en": "Reopen task"}), run: () => servicePort.update('aufgaben', aufgabenTargetId, UNDO_SETS).then(() => undefined) }
    : undefined;
  return {
    slug: 'aufgabe-bearbeiten' as const,
    draftKey: 'aufgabe-bearbeiten' as const,    actions: flowActions,    undo: flowUndo,    entity: 'aufgaben' as const,
    form: aufgaben,
    forms, formList, picks, submit, steps, targets, lists,    reviewStep: AUFGABEBEARBEITEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,    // the door the hook reads through — for what it does not own: availability
    // (useOccupancy(flow.port, …)), a count (useRecordCount(flow.port, …)). A page
    // importing servicePort next to the hook fails gate 3 (fewo 05.10.2026: the
    // gate taught useOccupancy(servicePort, …) and forbade servicePort at once)
    port: servicePort,
  };
}

export type AufgabeBearbeitenFlow = ReturnType<typeof useAufgabeBearbeitenFlow>;
