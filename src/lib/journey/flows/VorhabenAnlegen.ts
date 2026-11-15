/**
 * useVorhabenAnlegenFlow — the plumbing of the flow « Angebotsvorhaben anlegen », generated from the plan.
 *
 * Writes `angebotsvorhaben`: asks `kundenname`, `prioritaet`, `abgabefrist`, `bezeichnung`, `anfragenummer`, `eingangsdatum`, `projektleitung`, `auftragsvolumen`, `anfragebeschreibung`; sets `phase` itself.
Writes `aufgaben`: asks `titel`, `faelligkeit`, `fragestellung`, `verantwortlicher`; sets `art`, `status`, `ausloeser` itself; links `vorhaben` ← the created `angebotsvorhaben`.
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
 *   const flow = useVorhabenAnlegenFlow({
 *     steps: { projektleitung: 1, verantwortlicher: 2, kundenname: 3, prioritaet: 3, abgabefrist: 3, bezeichnung: 3, anfragenummer: 3, eingangsdatum: 3, auftragsvolumen: 3, anfragebeschreibung: 3, titel: 3, faelligkeit: 3, fragestellung: 3 },
 *     items: { projektleitung: r => ({ id: r.id, title: fieldText(r, 'vorname') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.projektleitung.select} {...flow.pick('projektleitung')} />
 *     <EntitySelectStep {...flow.picks.verantwortlicher.select} {...flow.pick('verantwortlicher')} />
 *     <Bound form={flow.forms.angebotsvorhaben} name="kundenname" />
 *     <Bound form={flow.forms.angebotsvorhaben} name="prioritaet" />
 *     <Bound form={flow.forms.angebotsvorhaben} name="abgabefrist" />
 *     <Bound form={flow.forms.angebotsvorhaben} name="bezeichnung" />
 *     <Bound form={flow.forms.angebotsvorhaben} name="anfragenummer" />
 *     <Bound form={flow.forms.angebotsvorhaben} name="eingangsdatum" />
 *     <Bound form={flow.forms.angebotsvorhaben} name="auftragsvolumen" />
 *     <Bound form={flow.forms.angebotsvorhaben} name="anfragebeschreibung" />
 *     <Bound form={flow.forms.aufgaben} name="titel" />
 *     <Bound form={flow.forms.aufgaben} name="faelligkeit" />
 *     <Bound form={flow.forms.aufgaben} name="fragestellung" />
 *     <StepNav onNext={() => flow.validateStep(n)} />
 *     {!flow.submit.done && <SummaryStep forms={flow.formList} submit={flow.submit} />}
 *     {flow.submit.result && <SuccessStep result={flow.submit.result} forms={flow.formList} submit={flow.submit} />}
 *   </IntentWizardShell>
 */
import { useEffect, useRef, useState } from 'react';
import { readJourneyExtra, writeJourneyExtra } from '@/lib/journey/draft';
import { nounOne } from '@/config/plan';
import {
  useStepForm, useJourneySubmit, useRecordSearch,
  fieldText, fieldLookup, fieldLookups, fieldNumber, fieldDate, fieldRef,
  todayIso, nowIso, isEmptyValue, policyFixedValue, withPickPolicy, usePolicyVersion,  type StepForm, type JourneyRecord, type RefContext, type SelectItemLike, type FormValues, type PlanStep, type SummaryItem,} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { pickHint, whereSentence, type PickWhere } from '@/lib/journey/policy';
import { labelOf, optionsOf, type EntityKey } from '@/lib/journey/rules';
import { entityLabel } from '@/lib/journey/rules';

export type VorhabenAnlegenFieldKey = 'abgabefrist' | 'anfragebeschreibung' | 'anfragenummer' | 'auftragsvolumen' | 'bezeichnung' | 'eingangsdatum' | 'faelligkeit' | 'fragestellung' | 'kundenname' | 'prioritaet' | 'projektleitung' | 'titel' | 'verantwortlicher';

export interface VorhabenAnlegenForms {
  angebotsvorhaben: StepForm<'angebotsvorhaben'>;
  aufgaben: StepForm<'aufgaben'>;
}

// Alias so the option generics stay readable.
type Key = VorhabenAnlegenFieldKey;

export interface VorhabenAnlegenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    projektleitung?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    verantwortlicher?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
  /** A page-side narrowing per pick, on top of the plan's filter (J-3): the
   *  questions of the picked event, the open ones — `r => fieldRef(r, 'veranstaltung') === eventId`. */
  where?: {
    projektleitung?: (record: JourneyRecord) => boolean;
    verantwortlicher?: (record: JourneyRecord) => boolean;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"abgabefrist": 3, "anfragebeschreibung": 3, "anfragenummer": 3, "auftragsvolumen": 3, "bezeichnung": 3, "eingangsdatum": 3, "faelligkeit": 3, "fragestellung": 3, "kundenname": 3, "prioritaet": 3, "projektleitung": 1, "titel": 3, "verantwortlicher": 2};
export const VORHABENANLEGEN_REVIEW_STEP = 4;

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

export function useVorhabenAnlegenFlow(options: VorhabenAnlegenFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const angebotsvorhaben = useStepForm('angebotsvorhaben', {
    fields: ["kundenname", "prioritaet", "abgabefrist", "bezeichnung", "anfragenummer", "eingangsdatum", "projektleitung", "auftragsvolumen", "anfragebeschreibung"],
    steps: only(steps, ["kundenname", "prioritaet", "abgabefrist", "bezeichnung", "anfragenummer", "eingangsdatum", "projektleitung", "auftragsvolumen", "anfragebeschreibung"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["kundenname", "prioritaet", "abgabefrist", "bezeichnung", "anfragenummer", "eingangsdatum", "projektleitung", "auftragsvolumen", "anfragebeschreibung"]),
    messages: only(options.messages as Record<string, string> | undefined, ["kundenname", "prioritaet", "abgabefrist", "bezeichnung", "anfragenummer", "eingangsdatum", "projektleitung", "auftragsvolumen", "anfragebeschreibung"]),
  });
  const aufgaben = useStepForm('aufgaben', {
    fields: ["titel", "faelligkeit", "fragestellung", "verantwortlicher"],
    steps: only(steps, ["titel", "faelligkeit", "fragestellung", "verantwortlicher"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["titel", "faelligkeit", "fragestellung", "verantwortlicher"]),
    messages: only(options.messages as Record<string, string> | undefined, ["titel", "faelligkeit", "fragestellung", "verantwortlicher"]),
  });
  const forms: VorhabenAnlegenForms = { angebotsvorhaben, aufgaben };
  // the editor of a list is not a record of its own: the review and the success
  // page read the entries (PlanStep.review), never the half-filled editor
  const formList: StepForm[] = [angebotsvorhaben, aufgaben];
  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  const searches = {
    projektleitung: useRecordSearch(servicePort, 'beteiligte', withPickPolicy('projektleitung', {
      searchFields: ["vorname", "nachname"] as never,
      filter: "r.v_aktiv == True",
      where: (r: JourneyRecord) => (r.fields["aktiv"] === true) && (options.where?.projektleitung?.(r) ?? true),
      toItem: options.items?.projektleitung as never,
      claim: 'angebotsvorhaben.projektleitung',
    })),
    verantwortlicher: useRecordSearch(servicePort, 'beteiligte', withPickPolicy('verantwortlicher', {
      searchFields: ["vorname", "nachname"] as never,
      filter: "r.v_aktiv == True",
      where: (r: JourneyRecord) => (r.fields["aktiv"] === true) && (options.where?.verantwortlicher?.(r) ?? true),
      toItem: options.items?.verantwortlicher as never,
      claim: 'aufgaben.verantwortlicher',
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:vorhaben-anlegen:read:${entity}`);
  // a fixed value the flow sets itself, as a review row with the link that changes it
  const setting = (entity: EntityKey, field: string, value: unknown): SummaryItem => ({
    key: `setting:${entity}.${field}`, label: labelOf(entity, field),
    value: optionsOf(entity, field).find(o => o.key === String(value))?.label ?? String(value ?? ''),
    href: `#/verwaltung/anwendung?line=intent:vorhaben-anlegen:write:${entity}.${field}`,
  });
  const picks = {
    projektleitung: { ...searches.projektleitung, select: { ...searches.projektleitung.select, create: false as boolean, hint: hintFor('projektleitung', 'beteiligte', {"conditions": [{"field": "aktiv", "op": "eq", "value": "true"}], "mode": "all"} as PickWhere | null) } },
    verantwortlicher: { ...searches.verantwortlicher, select: { ...searches.verantwortlicher.select, create: false as boolean, hint: hintFor('verantwortlicher', 'beteiligte', {"conditions": [{"field": "aktiv", "op": "eq", "value": "true"}], "mode": "all"} as PickWhere | null) } },
  };

  const plan: PlanStep[] = [
    {
      key: 'angebotsvorhaben', entity: 'angebotsvorhaben', form: angebotsvorhaben, label: nounOne('angebotsvorhaben', entityLabel('angebotsvorhaben')),
      values: (): FormValues => ({
        phase: policyFixedValue('angebotsvorhaben', 'phase') ?? "anfragepruefung",
      }),

      // the review shows what this step sets itself — changeable on „Deine Anwendung“, not here
      settings: () => [setting('angebotsvorhaben', 'phase', policyFixedValue('angebotsvorhaben', 'phase') ?? "anfragepruefung")],
    },
    {
      key: 'aufgaben', entity: 'aufgaben', form: aufgaben, label: nounOne('aufgaben', entityLabel('aufgaben')), primary: true,      needs: ['angebotsvorhaben'],
      link: { vorhaben: 'angebotsvorhaben' },

      values: (): FormValues => ({
        art: policyFixedValue('aufgaben', 'art') ?? "pruefentscheidung",
        status: policyFixedValue('aufgaben', 'status') ?? "aktiv",
        ausloeser: policyFixedValue('aufgaben', 'ausloeser') ?? "vorgabe",
      }),

      // the review shows what this step sets itself — changeable on „Deine Anwendung“, not here
      settings: () => [setting('aufgaben', 'art', policyFixedValue('aufgaben', 'art') ?? "pruefentscheidung"), setting('aufgaben', 'status', policyFixedValue('aufgaben', 'status') ?? "aktiv"), setting('aufgaben', 'ausloeser', policyFixedValue('aufgaben', 'ausloeser') ?? "vorgabe")],
    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'vorhaben-anlegen' });

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
    { const v = linkedParams.get('kundenname'); if (v !== null && isEmptyValue(angebotsvorhaben.get('kundenname'))) (angebotsvorhaben.set as (k: string, v: unknown) => void)('kundenname', coerce(angebotsvorhaben, 'kundenname', v)); }
    { const v = linkedParams.get('prioritaet'); if (v !== null && isEmptyValue(angebotsvorhaben.get('prioritaet'))) (angebotsvorhaben.set as (k: string, v: unknown) => void)('prioritaet', coerce(angebotsvorhaben, 'prioritaet', v)); }
    { const v = linkedParams.get('abgabefrist'); if (v !== null && isEmptyValue(angebotsvorhaben.get('abgabefrist'))) (angebotsvorhaben.set as (k: string, v: unknown) => void)('abgabefrist', coerce(angebotsvorhaben, 'abgabefrist', v)); }
    { const v = linkedParams.get('bezeichnung'); if (v !== null && isEmptyValue(angebotsvorhaben.get('bezeichnung'))) (angebotsvorhaben.set as (k: string, v: unknown) => void)('bezeichnung', coerce(angebotsvorhaben, 'bezeichnung', v)); }
    { const v = linkedParams.get('anfragenummer'); if (v !== null && isEmptyValue(angebotsvorhaben.get('anfragenummer'))) (angebotsvorhaben.set as (k: string, v: unknown) => void)('anfragenummer', coerce(angebotsvorhaben, 'anfragenummer', v)); }
    { const v = linkedParams.get('eingangsdatum'); if (v !== null && isEmptyValue(angebotsvorhaben.get('eingangsdatum'))) (angebotsvorhaben.set as (k: string, v: unknown) => void)('eingangsdatum', coerce(angebotsvorhaben, 'eingangsdatum', v)); }
    { const v = linkedParams.get('auftragsvolumen'); if (v !== null && isEmptyValue(angebotsvorhaben.get('auftragsvolumen'))) (angebotsvorhaben.set as (k: string, v: unknown) => void)('auftragsvolumen', coerce(angebotsvorhaben, 'auftragsvolumen', v)); }
    { const v = linkedParams.get('anfragebeschreibung'); if (v !== null && isEmptyValue(angebotsvorhaben.get('anfragebeschreibung'))) (angebotsvorhaben.set as (k: string, v: unknown) => void)('anfragebeschreibung', coerce(angebotsvorhaben, 'anfragebeschreibung', v)); }
    { const v = linkedParams.get('titel'); if (v !== null && isEmptyValue(aufgaben.get('titel'))) (aufgaben.set as (k: string, v: unknown) => void)('titel', coerce(aufgaben, 'titel', v)); }
    { const v = linkedParams.get('faelligkeit'); if (v !== null && isEmptyValue(aufgaben.get('faelligkeit'))) (aufgaben.set as (k: string, v: unknown) => void)('faelligkeit', coerce(aufgaben, 'faelligkeit', v)); }
    { const v = linkedParams.get('fragestellung'); if (v !== null && isEmptyValue(aufgaben.get('fragestellung'))) (aufgaben.set as (k: string, v: unknown) => void)('fragestellung', coerce(aufgaben, 'fragestellung', v)); }
    {
      const cur = forms.angebotsvorhaben.get('projektleitung');
      const fromLink = linkedParams.get('projektleitung');
      const unnamed = typeof cur === 'string' && cur !== '' && !forms.angebotsvorhaben.labels[cur] ? cur : null;
      const id = fromLink && isEmptyValue(cur) ? fromLink : unnamed;
      if (id) void servicePort.get('beteiligte', id).then(rec => {
        if (!on || !rec) return;
        picks.projektleitung.adopt(rec);
        const name = picks.projektleitung.labelOf(rec.id) ?? rec.id;
        (forms.angebotsvorhaben.set as (k: string, v: unknown, l?: string) => void)('projektleitung', rec.id, name);
        prefillFrom('projektleitung', rec);
      }).catch(() => undefined);
    }
    {
      const cur = forms.aufgaben.get('verantwortlicher');
      const fromLink = linkedParams.get('verantwortlicher');
      const unnamed = typeof cur === 'string' && cur !== '' && !forms.aufgaben.labels[cur] ? cur : null;
      const id = fromLink && isEmptyValue(cur) ? fromLink : unnamed;
      if (id) void servicePort.get('beteiligte', id).then(rec => {
        if (!on || !rec) return;
        picks.verantwortlicher.adopt(rec);
        const name = picks.verantwortlicher.labelOf(rec.id) ?? rec.id;
        (forms.aufgaben.set as (k: string, v: unknown, l?: string) => void)('verantwortlicher', rec.id, name);
        prefillFrom('verantwortlicher', rec);
      }).catch(() => undefined);
    }
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per link
  }, []);

  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: VorhabenAnlegenFieldKey) => {
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
  const pickMany = (field: VorhabenAnlegenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)));
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); };

  return {
    slug: 'vorhaben-anlegen' as const,
    draftKey: 'vorhaben-anlegen' as const,    entity: 'aufgaben' as const,
    form: aufgaben,
    forms, formList, picks, submit, steps,    reviewStep: VORHABENANLEGEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,    // the door the hook reads through — for what it does not own: availability
    // (useOccupancy(flow.port, …)), a count (useRecordCount(flow.port, …)). A page
    // importing servicePort next to the hook fails gate 3 (fewo 05.10.2026: the
    // gate taught useOccupancy(servicePort, …) and forbade servicePort at once)
    port: servicePort,
  };
}

export type VorhabenAnlegenFlow = ReturnType<typeof useVorhabenAnlegenFlow>;
