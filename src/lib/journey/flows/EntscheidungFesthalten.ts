/**
 * useEntscheidungFesthaltenFlow — the plumbing of the flow « Entscheidung festhalten », generated from the plan.
 *
 * Writes `entscheidungen`: asks `vorhaben`, `aufgabe`, `entscheider`, `frage`, `ergebnis`, `begruendung`, `bedingungen`, `finanzielle_auswirkung`, `freigabe_noetig`; sets `entscheidungsdatum` itself.
Changes `angebotsvorhaben` (only when the person fills it): the record to change is picked (`flow.pick('angebotsvorhaben')`), the form is prefilled with its values; asks `phase`.
 * The hook OWNS: the form(s) with exactly these fields and the plan's required
 * ingredients, one record search per picked field (columns and filter from
 * the plan), and the submit plan with its fixed and derived values. A page
 * that only calls `flow.submit.run()` cannot write a field the plan does not
 * know — there is no way to spell it.
 *
 * YOU decide what a person notices, through the options:
 *   steps     which wizard step asks which field (default: one step per pick,
 *             then one for the typed fields, then "Prüfen" = step 6)
 *   items     how a search hit is displayed per pick (title, subtitle, status …)
 *   initial   prefills for typed fields
 *   messages  the sentence for an empty required field, per field
 *
 *   const flow = useEntscheidungFesthaltenFlow({
 *     steps: { angebotsvorhaben: 1, vorhaben: 2, aufgabe: 3, entscheider: 4, frage: 5, ergebnis: 5, begruendung: 5, bedingungen: 5, finanzielle_auswirkung: 5, freigabe_noetig: 5, phase: 5 },
 *     items: { vorhaben: r => ({ id: r.id, title: fieldText(r, 'bezeichnung') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.vorhaben.select} {...flow.pick('vorhaben')} />
 *     <EntitySelectStep {...flow.picks.aufgabe.select} {...flow.pick('aufgabe')} />
 *     <EntitySelectStep {...flow.picks.entscheider.select} {...flow.pick('entscheider')} />
 *     // the record this flow changes: <EntitySelectStep {...flow.picks.angebotsvorhaben.select} {...flow.pick('angebotsvorhaben')} />
 *     <Bound form={flow.forms.entscheidungen} name="frage" />
 *     <Bound form={flow.forms.entscheidungen} name="ergebnis" />
 *     <Bound form={flow.forms.entscheidungen} name="begruendung" />
 *     <Bound form={flow.forms.entscheidungen} name="bedingungen" />
 *     <Bound form={flow.forms.entscheidungen} name="finanzielle_auswirkung" />
 *     <Bound form={flow.forms.entscheidungen} name="freigabe_noetig" />
 *     <Bound form={flow.forms.angebotsvorhaben} name="phase" />
 *     <StepNav onNext={() => flow.validateStep(n)} />
 *     {!flow.submit.done && <SummaryStep forms={flow.formList} submit={flow.submit} />}
 *     {flow.submit.result && <SuccessStep result={flow.submit.result} forms={flow.formList} submit={flow.submit} undo={flow.undo} />}
 *   </IntentWizardShell>
 */
import { useEffect, useRef, useState } from 'react';
import { readJourneyExtra, writeJourneyExtra } from '@/lib/journey/draft';
import { nounOne } from '@/config/plan';
import {
  useStepForm, useJourneySubmit, useRecordSearch,
  fieldText, fieldLookup, fieldLookups, fieldNumber, fieldDate, fieldRef,
  todayIso, nowIso, isEmptyValue, policyFixedValue, withPickPolicy, usePolicyVersion, refFilter, combineFilters,  type StepForm, type JourneyRecord, type RefContext, type SelectItemLike, type FormValues, type PlanStep,} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { requestWizardStep } from '@/lib/journey/useStepForm';
import { reportReadFailure } from '@/lib/journey/readFailures';
import { pickHint, whereSentence, type PickWhere } from '@/lib/journey/policy';
import { labelOf, optionsOf, type EntityKey } from '@/lib/journey/rules';
import { entityLabel } from '@/lib/journey/rules';

export type EntscheidungFesthaltenFieldKey = 'angebotsvorhaben' | 'aufgabe' | 'bedingungen' | 'begruendung' | 'entscheider' | 'ergebnis' | 'finanzielle_auswirkung' | 'frage' | 'freigabe_noetig' | 'phase' | 'vorhaben';

export interface EntscheidungFesthaltenForms {
  entscheidungen: StepForm<'entscheidungen'>;
  angebotsvorhaben: StepForm<'angebotsvorhaben'>;
}

// Alias so the option generics stay readable.
type Key = EntscheidungFesthaltenFieldKey;

export interface EntscheidungFesthaltenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    vorhaben?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    aufgabe?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    entscheider?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    angebotsvorhaben?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
  /** A page-side narrowing per pick, on top of the plan's filter (J-3): the
   *  questions of the picked event, the open ones — `r => fieldRef(r, 'veranstaltung') === eventId`. */
  where?: {
    vorhaben?: (record: JourneyRecord) => boolean;
    aufgabe?: (record: JourneyRecord) => boolean;
    entscheider?: (record: JourneyRecord) => boolean;
    angebotsvorhaben?: (record: JourneyRecord) => boolean;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"angebotsvorhaben": 1, "aufgabe": 3, "bedingungen": 5, "begruendung": 5, "entscheider": 4, "ergebnis": 5, "finanzielle_auswirkung": 5, "frage": 5, "freigabe_noetig": 5, "phase": 5, "vorhaben": 2};
export const ENTSCHEIDUNGFESTHALTEN_REVIEW_STEP = 6;
// a label of the plan in the page's language
function labelIn(m: Record<string, string>): string {
  const l = (typeof document !== 'undefined' ? document.documentElement.lang : '') || 'de';
  return m[l.slice(0, 2)] ?? m.de ?? Object.values(m)[0] ?? '';
}
// the counter-action (plan: undo) — what puts the changed record back
const UNDO_SETS: Record<string, unknown> = {"phase": "anfragepruefung"};

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

export function useEntscheidungFesthaltenFlow(options: EntscheidungFesthaltenFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const [angebotsvorhabenTargetId, setAngebotsvorhabenTargetId] = useState<string | null>(null);
  const entscheidungen = useStepForm('entscheidungen', {
    fields: ["vorhaben", "aufgabe", "entscheider", "frage", "ergebnis", "begruendung", "bedingungen", "finanzielle_auswirkung", "freigabe_noetig"],
    steps: only(steps, ["vorhaben", "aufgabe", "entscheider", "frage", "ergebnis", "begruendung", "bedingungen", "finanzielle_auswirkung", "freigabe_noetig"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["vorhaben", "aufgabe", "entscheider", "frage", "ergebnis", "begruendung", "bedingungen", "finanzielle_auswirkung", "freigabe_noetig"]),
    messages: only(options.messages as Record<string, string> | undefined, ["vorhaben", "aufgabe", "entscheider", "frage", "ergebnis", "begruendung", "bedingungen", "finanzielle_auswirkung", "freigabe_noetig"]),
  });
  const angebotsvorhaben = useStepForm('angebotsvorhaben', {
    fields: ["phase"],
    steps: only(steps, ["phase"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["phase"]),
    messages: only(options.messages as Record<string, string> | undefined, ["phase"]),
  });
  const forms: EntscheidungFesthaltenForms = { entscheidungen, angebotsvorhaben };
  // the editor of a list is not a record of its own: the review and the success
  // page read the entries (PlanStep.review), never the half-filled editor
  const formList: StepForm[] = [entscheidungen, angebotsvorhaben];
  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  // a pick that belongs to another pick's record (A9): server filter + its client twin
  const dependsOn = (dep: unknown, field: string) => (typeof dep === 'string' && /^[a-f0-9]{24}$/i.test(dep) ? refFilter(field, dep) : undefined);
  const dependsWhere = (r: JourneyRecord, field: string, dep: unknown) => typeof dep !== 'string' || dep === '' || fieldRef(r, field) === dep;
  const searches = {
    vorhaben: useRecordSearch(servicePort, 'angebotsvorhaben', withPickPolicy('vorhaben', {
      searchFields: ["bezeichnung", "kundenname"] as never,
      // only the angebotsvorhaben of the entscheider picked before
      filter: combineFilters("r.v_phase not in ['angebot_abgegeben', 'abgebrochen']", dependsOn(entscheidungen.get("entscheider"), 'projektleitung')),
      where: (r: JourneyRecord) => (!["angebot_abgegeben", "abgebrochen"].includes(fieldLookup(r, "phase")?.key ?? '')) && dependsWhere(r, 'projektleitung', entscheidungen.get("entscheider")) && (options.where?.vorhaben?.(r) ?? true),
      toItem: options.items?.vorhaben as never,
      claim: 'entscheidungen.vorhaben',
    })),
    aufgabe: useRecordSearch(servicePort, 'aufgaben', withPickPolicy('aufgabe', {
      searchFields: ["titel"] as never,
      // only the aufgaben of the vorhaben picked before
      filter: combineFilters("r.v_status != 'entfallen'", dependsOn(entscheidungen.get("vorhaben"), 'vorhaben')),
      where: (r: JourneyRecord) => ((fieldLookup(r, "status")?.key ?? null) !== "entfallen") && dependsWhere(r, 'vorhaben', entscheidungen.get("vorhaben")) && (options.where?.aufgabe?.(r) ?? true),
      toItem: options.items?.aufgabe as never,
      claim: 'entscheidungen.aufgabe',
    })),
    entscheider: useRecordSearch(servicePort, 'beteiligte', withPickPolicy('entscheider', {
      searchFields: ["vorname", "nachname"] as never,
      filter: "r.v_aktiv == True",
      where: (r: JourneyRecord) => (r.fields["aktiv"] === true) && (options.where?.entscheider?.(r) ?? true),
      toItem: options.items?.entscheider as never,
      claim: 'entscheidungen.entscheider',
    })),
    angebotsvorhaben: useRecordSearch(servicePort, 'angebotsvorhaben', withPickPolicy('angebotsvorhaben', {
      searchFields: ["bezeichnung", "kundenname"] as never,
      // only the angebotsvorhaben of the entscheider picked before
      filter: combineFilters("r.v_phase not in ['angebot_abgegeben', 'abgebrochen']", dependsOn(entscheidungen.get("entscheider"), 'projektleitung')),
      where: (r: JourneyRecord) => (!["angebot_abgegeben", "abgebrochen"].includes(fieldLookup(r, "phase")?.key ?? '')) && dependsWhere(r, 'projektleitung', entscheidungen.get("entscheider")) && (options.where?.angebotsvorhaben?.(r) ?? true),
      toItem: options.items?.angebotsvorhaben as never,
      includeTaken: true,
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:entscheidung-festhalten:read:${entity}`);
  const picks = {
    vorhaben: { ...searches.vorhaben, select: { ...searches.vorhaben.select, create: false as boolean, hint: hintFor('vorhaben', 'angebotsvorhaben', {"conditions": [{"field": "phase", "op": "not_in", "value": ["angebot_abgegeben", "abgebrochen"]}], "mode": "all"} as PickWhere | null) } },
    aufgabe: { ...searches.aufgabe, select: { ...searches.aufgabe.select, create: false as boolean, hint: hintFor('aufgabe', 'aufgaben', {"conditions": [{"field": "status", "op": "ne", "value": "entfallen"}], "mode": "all"} as PickWhere | null) } },
    entscheider: { ...searches.entscheider, select: { ...searches.entscheider.select, create: false as boolean, hint: hintFor('entscheider', 'beteiligte', {"conditions": [{"field": "aktiv", "op": "eq", "value": "true"}], "mode": "all"} as PickWhere | null) } },
    angebotsvorhaben: { ...searches.angebotsvorhaben, select: { ...searches.angebotsvorhaben.select, create: false as boolean, hint: hintFor('angebotsvorhaben', 'angebotsvorhaben', {"conditions": [{"field": "phase", "op": "not_in", "value": ["angebot_abgegeben", "abgebrochen"]}], "mode": "all"} as PickWhere | null) } },
  };

  const angebotsvorhabenFilled = hasValues(angebotsvorhaben);
  const plan: PlanStep[] = [
    {
      key: 'entscheidungen', entity: 'entscheidungen', form: entscheidungen, label: nounOne('entscheidungen', entityLabel('entscheidungen')), primary: true,
      values: (): FormValues => ({
        entscheidungsdatum: policyFixedValue('entscheidungen', 'entscheidungsdatum') ?? todayIso(),
      }),

      // the planner's assumptions that first act here — shown once with „Passt“ / „ändern“
      notices: () => [{"assumed": "von Hand", "id": "phase-nach-entscheidung", "question": "Wer setzt die Phase nach einer Entscheidung?"}],
    },
    ...(angebotsvorhabenFilled ? [{
      key: 'angebotsvorhaben', entity: 'angebotsvorhaben', form: angebotsvorhaben, label: nounOne('angebotsvorhaben', entityLabel('angebotsvorhaben')),
      updates: () => angebotsvorhabenTargetId ?? undefined,
      // the review names the record this step changes; "Ändern" leads back to its pick
      target: () => angebotsvorhabenTargetId
        ? { key: 'target:angebotsvorhaben', label: nounOne('angebotsvorhaben', entityLabel('angebotsvorhaben')), value: picks.angebotsvorhaben.labelOf(angebotsvorhabenTargetId) ?? angebotsvorhabenTargetId, step: steps.angebotsvorhaben }
        : undefined,    } as PlanStep] : []),
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'entscheidung-festhalten' });

  // A typed field the plan prefills from the picked record (`user:from_pick`),
  // still the person's to change: filled once, only while empty (PV-12)
  const prefillFrom = (pickKey: string, rec: JourneyRecord) => {
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
    { const v = linkedParams.get('frage'); if (v !== null && isEmptyValue(entscheidungen.get('frage'))) (entscheidungen.set as (k: string, v: unknown) => void)('frage', coerce(entscheidungen, 'frage', v)); }
    { const v = linkedParams.get('ergebnis'); if (v !== null && isEmptyValue(entscheidungen.get('ergebnis'))) (entscheidungen.set as (k: string, v: unknown) => void)('ergebnis', coerce(entscheidungen, 'ergebnis', v)); }
    { const v = linkedParams.get('begruendung'); if (v !== null && isEmptyValue(entscheidungen.get('begruendung'))) (entscheidungen.set as (k: string, v: unknown) => void)('begruendung', coerce(entscheidungen, 'begruendung', v)); }
    { const v = linkedParams.get('bedingungen'); if (v !== null && isEmptyValue(entscheidungen.get('bedingungen'))) (entscheidungen.set as (k: string, v: unknown) => void)('bedingungen', coerce(entscheidungen, 'bedingungen', v)); }
    { const v = linkedParams.get('finanzielle_auswirkung'); if (v !== null && isEmptyValue(entscheidungen.get('finanzielle_auswirkung'))) (entscheidungen.set as (k: string, v: unknown) => void)('finanzielle_auswirkung', coerce(entscheidungen, 'finanzielle_auswirkung', v)); }
    { const v = linkedParams.get('freigabe_noetig'); if (v !== null && isEmptyValue(entscheidungen.get('freigabe_noetig'))) (entscheidungen.set as (k: string, v: unknown) => void)('freigabe_noetig', coerce(entscheidungen, 'freigabe_noetig', v)); }
    { const v = linkedParams.get('phase'); if (v !== null && isEmptyValue(angebotsvorhaben.get('phase'))) (angebotsvorhaben.set as (k: string, v: unknown) => void)('phase', coerce(angebotsvorhaben, 'phase', v)); }
    {
      const cur = forms.entscheidungen.get('vorhaben');
      const fromLink = linkedParams.get('vorhaben');
      const unnamed = typeof cur === 'string' && cur !== '' && !forms.entscheidungen.labels[cur] ? cur : null;
      const id = fromLink && isEmptyValue(cur) ? fromLink : unnamed;
      if (id) void servicePort.get('angebotsvorhaben', id).then(rec => {
        if (!on || !rec) return;
        picks.vorhaben.adopt(rec);
        const name = picks.vorhaben.labelOf(rec.id) ?? rec.id;
        (forms.entscheidungen.set as (k: string, v: unknown, l?: string) => void)('vorhaben', rec.id, name);
        prefillFrom('vorhaben', rec);
      }).catch(() => undefined);
    }
    {
      const cur = forms.entscheidungen.get('aufgabe');
      const fromLink = linkedParams.get('aufgabe');
      const unnamed = typeof cur === 'string' && cur !== '' && !forms.entscheidungen.labels[cur] ? cur : null;
      const id = fromLink && isEmptyValue(cur) ? fromLink : unnamed;
      if (id) void servicePort.get('aufgaben', id).then(rec => {
        if (!on || !rec) return;
        picks.aufgabe.adopt(rec);
        const name = picks.aufgabe.labelOf(rec.id) ?? rec.id;
        (forms.entscheidungen.set as (k: string, v: unknown, l?: string) => void)('aufgabe', rec.id, name);
        prefillFrom('aufgabe', rec);
      }).catch(() => undefined);
    }
    {
      const cur = forms.entscheidungen.get('entscheider');
      const fromLink = linkedParams.get('entscheider');
      const unnamed = typeof cur === 'string' && cur !== '' && !forms.entscheidungen.labels[cur] ? cur : null;
      const id = fromLink && isEmptyValue(cur) ? fromLink : unnamed;
      if (id) void servicePort.get('beteiligte', id).then(rec => {
        if (!on || !rec) return;
        picks.entscheider.adopt(rec);
        const name = picks.entscheider.labelOf(rec.id) ?? rec.id;
        (forms.entscheidungen.set as (k: string, v: unknown, l?: string) => void)('entscheider', rec.id, name);
        prefillFrom('entscheider', rec);
      }).catch(() => undefined);
    }
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per link
  }, []);

  /** The record(s) this flow CHANGES: picked through {...flow.picks.<entity>.select} {...flow.pick('<entity>')};
   *  picking prefills the form with the record's current values, and the plan step updates that record. */
  const targets = {
    angebotsvorhaben: {
      selectedId: angebotsvorhabenTargetId,
      onSelect: (id: string) => {
        setAngebotsvorhabenTargetId(id);
        const rec = picks.angebotsvorhaben.recordOf(id);
        if (rec) angebotsvorhaben.reset({ phase: fieldLookup(rec, "phase")?.key, });
        // survives a reload: in the draft's side data, and as `?record=` in the address (J-8)
        writeJourneyExtra('entscheidung-festhalten', 'target:angebotsvorhaben', id);
        mirrorRecordParam(id);
      },
      get record(): JourneyRecord | undefined { return angebotsvorhabenTargetId ? picks.angebotsvorhaben.recordOf(angebotsvorhabenTargetId) : undefined; },
    },
  };
  // Opened for one record — `#/intents/entscheidung-festhalten?record=<id>`, the dashboard's
  // flowActionFor(): that record is the one to change. Loaded, taken into the
  // pick and selected — when this flow may change it at all (the pick's rule).
  // After a reload the pick comes back the same way: from the address, else
  // from the draft's side data (J-8).
  const [linkedId] = useState(() => new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('record')
    ?? readJourneyExtra<string>('entscheidung-festhalten', 'target:angebotsvorhaben'));
  useEffect(() => {
    if (!linkedId) return;
    let on = true;
    void servicePort.get('angebotsvorhaben', linkedId).then(rec => {
      if (!on || !rec || !((r: JourneyRecord) => !["angebot_abgegeben", "abgebrochen"].includes(fieldLookup(r, "phase")?.key ?? ''))(rec)) return;
      reportReadFailure('entscheidung-festhalten:linked', null);
      picks.angebotsvorhaben.adopt(rec);
      targets.angebotsvorhaben.onSelect(rec.id);
      // the link named the record — start after the steps that pick it, without the start screen
      const after = Math.max(...Object.keys(targets).map(k => steps[k] ?? 1)) + 1;
      if (new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('record') === linkedId) requestWizardStep(after);
    }).catch(() => { if (on) reportReadFailure('entscheidung-festhalten:linked', 'angebotsvorhaben'); });
    return () => { on = false; reportReadFailure('entscheidung-festhalten:linked', null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per link
  }, [linkedId]);
  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: EntscheidungFesthaltenFieldKey) => {
    if (field in targets) {
      const t = targets[field as keyof typeof targets];
      return { selectedId: t.selectedId, onSelect: t.onSelect };
    }
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
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
  const pickMany = (field: EntscheidungFesthaltenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)))    && Object.entries(targets).every(([k, t]) => steps[k] !== n || !!t.selectedId);
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); setAngebotsvorhabenTargetId(null); writeJourneyExtra('entscheidung-festhalten', 'target:angebotsvorhaben', null); mirrorRecordParam(null); };

  /** The counter-action of the changed record — `undo={flow.undo}` on <SuccessStep> (PV-15). */
  const flowUndo = angebotsvorhabenTargetId
    ? { label: labelIn({"de": "Phase zur\u00fcck auf Anfragepr\u00fcfung", "en": "Reset phase to request review"}), run: () => servicePort.update('angebotsvorhaben', angebotsvorhabenTargetId, UNDO_SETS).then(() => undefined) }
    : undefined;
  return {
    slug: 'entscheidung-festhalten' as const,
    draftKey: 'entscheidung-festhalten' as const,    undo: flowUndo,    entity: 'entscheidungen' as const,
    form: entscheidungen,
    forms, formList, picks, submit, steps, targets,    reviewStep: ENTSCHEIDUNGFESTHALTEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,    // the door the hook reads through — for what it does not own: availability
    // (useOccupancy(flow.port, …)), a count (useRecordCount(flow.port, …)). A page
    // importing servicePort next to the hook fails gate 3 (fewo 05.10.2026: the
    // gate taught useOccupancy(servicePort, …) and forbade servicePort at once)
    port: servicePort,
  };
}

export type EntscheidungFesthaltenFlow = ReturnType<typeof useEntscheidungFesthaltenFlow>;
