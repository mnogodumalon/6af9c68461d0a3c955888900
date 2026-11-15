/**
 * useAnforderungAnlegenFlow — the plumbing of the flow « Anforderung anlegen », generated from the plan.
 *
 * Writes `anforderungen`: asks `titel`, `vorhaben`, `gueltig_ab`, `quellenart`, `beschreibung`, `quellenangabe`, `vorgaengerversion`; sets `status` itself.
 * The hook OWNS: the form(s) with exactly these fields and the plan's required
 * ingredients, one record search per picked field (columns and filter from
 * the plan), and the submit plan with its fixed and derived values. A page
 * that only calls `flow.submit.run()` cannot write a field the plan does not
 * know — there is no way to spell it.
 *
 * YOU decide what a person notices, through the options:
 *   steps     which wizard step asks which field (default: one step per pick,
 *             then one for the typed fields, then "Prüfen" = step 4)
 *   items     how a search hit is displayed per pick (title, subtitle, status …)
 *   initial   prefills for typed fields
 *   messages  the sentence for an empty required field, per field
 *
 *   const flow = useAnforderungAnlegenFlow({
 *     steps: { vorhaben: 1, vorgaengerversion: 2, titel: 3, gueltig_ab: 3, quellenart: 3, beschreibung: 3, quellenangabe: 3 },
 *     items: { vorhaben: r => ({ id: r.id, title: fieldText(r, 'bezeichnung') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.vorhaben.select} {...flow.pick('vorhaben')} />
 *     <EntitySelectStep {...flow.picks.vorgaengerversion.select} {...flow.pick('vorgaengerversion')} />
 *     <Bound form={flow.forms.anforderungen} name="titel" />
 *     <Bound form={flow.forms.anforderungen} name="gueltig_ab" />
 *     <Bound form={flow.forms.anforderungen} name="quellenart" />
 *     <Bound form={flow.forms.anforderungen} name="beschreibung" />
 *     <Bound form={flow.forms.anforderungen} name="quellenangabe" />
 *     <StepNav onNext={() => flow.validateStep(n)} />
 *     {!flow.submit.done && <SummaryStep forms={flow.formList} submit={flow.submit} variants={flow.actions} />}
 *     {flow.submit.result && <SuccessStep result={flow.submit.result} forms={flow.formList} submit={flow.submit} />}
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
import { pickHint, whereSentence, type PickWhere } from '@/lib/journey/policy';
import { labelOf, optionsOf, type EntityKey } from '@/lib/journey/rules';
import { entityLabel } from '@/lib/journey/rules';

export type AnforderungAnlegenFieldKey = 'beschreibung' | 'gueltig_ab' | 'quellenangabe' | 'quellenart' | 'titel' | 'vorgaengerversion' | 'vorhaben';

export interface AnforderungAnlegenForms {
  anforderungen: StepForm<'anforderungen'>;
}

// Alias so the option generics stay readable.
type Key = AnforderungAnlegenFieldKey;

export interface AnforderungAnlegenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    vorhaben?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    vorgaengerversion?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
  /** A page-side narrowing per pick, on top of the plan's filter (J-3): the
   *  questions of the picked event, the open ones — `r => fieldRef(r, 'veranstaltung') === eventId`. */
  where?: {
    vorhaben?: (record: JourneyRecord) => boolean;
    vorgaengerversion?: (record: JourneyRecord) => boolean;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"beschreibung": 3, "gueltig_ab": 3, "quellenangabe": 3, "quellenart": 3, "titel": 3, "vorgaengerversion": 2, "vorhaben": 1};
export const ANFORDERUNGANLEGEN_REVIEW_STEP = 4;
// a label of the plan in the page's language
function labelIn(m: Record<string, string>): string {
  const l = (typeof document !== 'undefined' ? document.documentElement.lang : '') || 'de';
  return m[l.slice(0, 2)] ?? m.de ?? Object.values(m)[0] ?? '';
}
// the ways this flow may END (plan: success.actions) — the review shows one
// button per entry, the chosen one sets these values on the primary record
const ACTION_SETS: Record<string, FormValues> = { 'anforderung-gueltig': {"status": "gueltig"} };

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

export function useAnforderungAnlegenFlow(options: AnforderungAnlegenFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const variantRef = useRef<string | null>(null);   // the end action the person chose (PV-14)
  const anforderungen = useStepForm('anforderungen', {
    fields: ["titel", "vorhaben", "gueltig_ab", "quellenart", "beschreibung", "quellenangabe", "vorgaengerversion"],
    steps: only(steps, ["titel", "vorhaben", "gueltig_ab", "quellenart", "beschreibung", "quellenangabe", "vorgaengerversion"]) as Record<string, number>,
    // the plan builds a value from these — required here, whatever the app's base view says
    required: { vorhaben: true },
    initial: only(options.initial as FormValues | undefined, ["titel", "vorhaben", "gueltig_ab", "quellenart", "beschreibung", "quellenangabe", "vorgaengerversion"]),
    messages: only(options.messages as Record<string, string> | undefined, ["titel", "vorhaben", "gueltig_ab", "quellenart", "beschreibung", "quellenangabe", "vorgaengerversion"]),
  });
  const forms: AnforderungAnlegenForms = { anforderungen };
  // the editor of a list is not a record of its own: the review and the success
  // page read the entries (PlanStep.review), never the half-filled editor
  const formList: StepForm[] = [anforderungen];
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
      filter: "r.v_phase not in ['angebot_abgegeben', 'abgebrochen']",
      where: (r: JourneyRecord) => (!["angebot_abgegeben", "abgebrochen"].includes(fieldLookup(r, "phase")?.key ?? '')) && (options.where?.vorhaben?.(r) ?? true),
      toItem: options.items?.vorhaben as never,
      claim: 'anforderungen.vorhaben',
    })),
    vorgaengerversion: useRecordSearch(servicePort, 'anforderungen', withPickPolicy('vorgaengerversion', {
      searchFields: ["titel"] as never,
      // only the anforderungen of the vorhaben picked before
      filter: combineFilters("r.v_status == 'gueltig'", dependsOn(anforderungen.get("vorhaben"), 'vorhaben')),
      where: (r: JourneyRecord) => ((fieldLookup(r, "status")?.key ?? null) === "gueltig") && dependsWhere(r, 'vorhaben', anforderungen.get("vorhaben")) && (options.where?.vorgaengerversion?.(r) ?? true),
      toItem: options.items?.vorgaengerversion as never,
      claim: 'anforderungen.vorgaengerversion',
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:anforderung-anlegen:read:${entity}`);
  // a fixed value the flow sets itself, as a review row with the link that changes it
  const setting = (entity: EntityKey, field: string, value: unknown): SummaryItem => ({
    key: `setting:${entity}.${field}`, label: labelOf(entity, field),
    value: optionsOf(entity, field).find(o => o.key === String(value))?.label ?? String(value ?? ''),
    href: `#/verwaltung/anwendung?line=intent:anforderung-anlegen:write:${entity}.${field}`,
  });
  const picks = {
    vorhaben: { ...searches.vorhaben, select: { ...searches.vorhaben.select, create: false as boolean, hint: hintFor('vorhaben', 'angebotsvorhaben', {"conditions": [{"field": "phase", "op": "not_in", "value": ["angebot_abgegeben", "abgebrochen"]}], "mode": "all"} as PickWhere | null) } },
    vorgaengerversion: { ...searches.vorgaengerversion, select: { ...searches.vorgaengerversion.select, create: false as boolean, hint: hintFor('vorgaengerversion', 'anforderungen', {"conditions": [{"field": "status", "op": "eq", "value": "gueltig"}], "mode": "all"} as PickWhere | null) } },
  };

  const plan: PlanStep[] = [
    {
      key: 'anforderungen', entity: 'anforderungen', form: anforderungen, label: nounOne('anforderungen', entityLabel('anforderungen')), primary: true,
      values: (): FormValues => ({
        status: policyFixedValue('anforderungen', 'status') ?? "entwurf",
        ...(variantRef.current ? ACTION_SETS[variantRef.current] ?? {} : {}),
      }),

      // the review shows what this step sets itself — changeable on „Deine Anwendung“, not here
      settings: () => [setting('anforderungen', 'status', policyFixedValue('anforderungen', 'status') ?? "entwurf")],

      // the planner's assumptions that first act here — shown once with „Passt“ / „ändern“
      notices: () => [{"assumed": "von Hand oder per Ablauf-Aktion", "id": "anforderung-status-wechsel", "question": "Wer setzt eine Anforderung von Entwurf auf G\u00fcltig?"}],
    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'anforderung-anlegen' });

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
    { const v = linkedParams.get('titel'); if (v !== null && isEmptyValue(anforderungen.get('titel'))) (anforderungen.set as (k: string, v: unknown) => void)('titel', coerce(anforderungen, 'titel', v)); }
    { const v = linkedParams.get('gueltig_ab'); if (v !== null && isEmptyValue(anforderungen.get('gueltig_ab'))) (anforderungen.set as (k: string, v: unknown) => void)('gueltig_ab', coerce(anforderungen, 'gueltig_ab', v)); }
    { const v = linkedParams.get('quellenart'); if (v !== null && isEmptyValue(anforderungen.get('quellenart'))) (anforderungen.set as (k: string, v: unknown) => void)('quellenart', coerce(anforderungen, 'quellenart', v)); }
    { const v = linkedParams.get('beschreibung'); if (v !== null && isEmptyValue(anforderungen.get('beschreibung'))) (anforderungen.set as (k: string, v: unknown) => void)('beschreibung', coerce(anforderungen, 'beschreibung', v)); }
    { const v = linkedParams.get('quellenangabe'); if (v !== null && isEmptyValue(anforderungen.get('quellenangabe'))) (anforderungen.set as (k: string, v: unknown) => void)('quellenangabe', coerce(anforderungen, 'quellenangabe', v)); }
    {
      const cur = forms.anforderungen.get('vorhaben');
      const fromLink = linkedParams.get('vorhaben');
      const unnamed = typeof cur === 'string' && cur !== '' && !forms.anforderungen.labels[cur] ? cur : null;
      const id = fromLink && isEmptyValue(cur) ? fromLink : unnamed;
      if (id) void servicePort.get('angebotsvorhaben', id).then(rec => {
        if (!on || !rec) return;
        picks.vorhaben.adopt(rec);
        const name = picks.vorhaben.labelOf(rec.id) ?? rec.id;
        (forms.anforderungen.set as (k: string, v: unknown, l?: string) => void)('vorhaben', rec.id, name);
        prefillFrom('vorhaben', rec);
      }).catch(() => undefined);
    }
    {
      const cur = forms.anforderungen.get('vorgaengerversion');
      const fromLink = linkedParams.get('vorgaengerversion');
      const unnamed = typeof cur === 'string' && cur !== '' && !forms.anforderungen.labels[cur] ? cur : null;
      const id = fromLink && isEmptyValue(cur) ? fromLink : unnamed;
      if (id) void servicePort.get('anforderungen', id).then(rec => {
        if (!on || !rec) return;
        picks.vorgaengerversion.adopt(rec);
        const name = picks.vorgaengerversion.labelOf(rec.id) ?? rec.id;
        (forms.anforderungen.set as (k: string, v: unknown, l?: string) => void)('vorgaengerversion', rec.id, name);
        prefillFrom('vorgaengerversion', rec);
      }).catch(() => undefined);
    }
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per link
  }, []);

  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: AnforderungAnlegenFieldKey) => {
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
  const pickMany = (field: AnforderungAnlegenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)));
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); };

  /** The ways this flow may end — spread as `variants={flow.actions}` onto <SummaryStep> (PV-14). */
  const flowActions = [
    { id: 'anforderung-gueltig', label: labelIn({"de": "Sofort auf G\u00fcltig setzen", "en": "Set to valid immediately"}), confirm: () => { variantRef.current = 'anforderung-gueltig'; return submit.run(); } },
  ];
  return {
    slug: 'anforderung-anlegen' as const,
    draftKey: 'anforderung-anlegen' as const,    actions: flowActions,    entity: 'anforderungen' as const,
    form: anforderungen,
    forms, formList, picks, submit, steps,    reviewStep: ANFORDERUNGANLEGEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,    // the door the hook reads through — for what it does not own: availability
    // (useOccupancy(flow.port, …)), a count (useRecordCount(flow.port, …)). A page
    // importing servicePort next to the hook fails gate 3 (fewo 05.10.2026: the
    // gate taught useOccupancy(servicePort, …) and forbade servicePort at once)
    port: servicePort,
  };
}

export type AnforderungAnlegenFlow = ReturnType<typeof useAnforderungAnlegenFlow>;
