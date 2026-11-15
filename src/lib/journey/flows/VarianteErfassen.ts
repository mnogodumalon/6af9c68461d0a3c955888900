/**
 * useVarianteErfassenFlow — the plumbing of the flow « Angebotsvariante erfassen », generated from the plan.
 *
 * Writes `angebotsvarianten`: asks `vorhaben`, `variantenbezeichnung`, `beschreibung`, `menge`, `teillieferung`, `herstellkosten`, `beschaffungskosten`, `aufwand_stunden`, `angebotspreis`, `akzeptierte_risiken`, `vertragsbedingungen`, `liefertermin`; sets `status` itself.
 * The hook OWNS: the form(s) with exactly these fields and the plan's required
 * ingredients, one record search per picked field (columns and filter from
 * the plan), and the submit plan with its fixed and derived values. A page
 * that only calls `flow.submit.run()` cannot write a field the plan does not
 * know — there is no way to spell it.
 *
 * YOU decide what a person notices, through the options:
 *   steps     which wizard step asks which field (default: one step per pick,
 *             then one for the typed fields, then "Prüfen" = step 3)
 *   items     how a search hit is displayed per pick (title, subtitle, status …)
 *   initial   prefills for typed fields
 *   messages  the sentence for an empty required field, per field
 *
 *   const flow = useVarianteErfassenFlow({
 *     steps: { vorhaben: 1, variantenbezeichnung: 2, beschreibung: 2, menge: 2, teillieferung: 2, herstellkosten: 2, beschaffungskosten: 2, aufwand_stunden: 2, angebotspreis: 2, akzeptierte_risiken: 2, vertragsbedingungen: 2, liefertermin: 2 },
 *     items: { vorhaben: r => ({ id: r.id, title: fieldText(r, 'bezeichnung') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.vorhaben.select} {...flow.pick('vorhaben')} />
 *     <Bound form={flow.forms.angebotsvarianten} name="variantenbezeichnung" />
 *     <Bound form={flow.forms.angebotsvarianten} name="beschreibung" />
 *     <Bound form={flow.forms.angebotsvarianten} name="menge" />
 *     <Bound form={flow.forms.angebotsvarianten} name="teillieferung" />
 *     <Bound form={flow.forms.angebotsvarianten} name="herstellkosten" />
 *     <Bound form={flow.forms.angebotsvarianten} name="beschaffungskosten" />
 *     <Bound form={flow.forms.angebotsvarianten} name="aufwand_stunden" />
 *     <Bound form={flow.forms.angebotsvarianten} name="angebotspreis" />
 *     <Bound form={flow.forms.angebotsvarianten} name="akzeptierte_risiken" />
 *     <Bound form={flow.forms.angebotsvarianten} name="vertragsbedingungen" />
 *     <Bound form={flow.forms.angebotsvarianten} name="liefertermin" />
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

export type VarianteErfassenFieldKey = 'akzeptierte_risiken' | 'angebotspreis' | 'aufwand_stunden' | 'beschaffungskosten' | 'beschreibung' | 'herstellkosten' | 'liefertermin' | 'menge' | 'teillieferung' | 'variantenbezeichnung' | 'vertragsbedingungen' | 'vorhaben';

export interface VarianteErfassenForms {
  angebotsvarianten: StepForm<'angebotsvarianten'>;
}

// Alias so the option generics stay readable.
type Key = VarianteErfassenFieldKey;

export interface VarianteErfassenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    vorhaben?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
  /** A page-side narrowing per pick, on top of the plan's filter (J-3): the
   *  questions of the picked event, the open ones — `r => fieldRef(r, 'veranstaltung') === eventId`. */
  where?: {
    vorhaben?: (record: JourneyRecord) => boolean;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"akzeptierte_risiken": 2, "angebotspreis": 2, "aufwand_stunden": 2, "beschaffungskosten": 2, "beschreibung": 2, "herstellkosten": 2, "liefertermin": 2, "menge": 2, "teillieferung": 2, "variantenbezeichnung": 2, "vertragsbedingungen": 2, "vorhaben": 1};
export const VARIANTEERFASSEN_REVIEW_STEP = 3;

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

export function useVarianteErfassenFlow(options: VarianteErfassenFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const angebotsvarianten = useStepForm('angebotsvarianten', {
    fields: ["vorhaben", "variantenbezeichnung", "beschreibung", "menge", "teillieferung", "herstellkosten", "beschaffungskosten", "aufwand_stunden", "angebotspreis", "akzeptierte_risiken", "vertragsbedingungen", "liefertermin"],
    steps: only(steps, ["vorhaben", "variantenbezeichnung", "beschreibung", "menge", "teillieferung", "herstellkosten", "beschaffungskosten", "aufwand_stunden", "angebotspreis", "akzeptierte_risiken", "vertragsbedingungen", "liefertermin"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["vorhaben", "variantenbezeichnung", "beschreibung", "menge", "teillieferung", "herstellkosten", "beschaffungskosten", "aufwand_stunden", "angebotspreis", "akzeptierte_risiken", "vertragsbedingungen", "liefertermin"]),
    messages: only(options.messages as Record<string, string> | undefined, ["vorhaben", "variantenbezeichnung", "beschreibung", "menge", "teillieferung", "herstellkosten", "beschaffungskosten", "aufwand_stunden", "angebotspreis", "akzeptierte_risiken", "vertragsbedingungen", "liefertermin"]),
  });
  const forms: VarianteErfassenForms = { angebotsvarianten };
  // the editor of a list is not a record of its own: the review and the success
  // page read the entries (PlanStep.review), never the half-filled editor
  const formList: StepForm[] = [angebotsvarianten];
  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  const searches = {
    vorhaben: useRecordSearch(servicePort, 'angebotsvorhaben', withPickPolicy('vorhaben', {
      searchFields: ["bezeichnung", "kundenname"] as never,
      filter: "r.v_phase not in ['angebot_abgegeben', 'abgebrochen']",
      where: (r: JourneyRecord) => (!["angebot_abgegeben", "abgebrochen"].includes(fieldLookup(r, "phase")?.key ?? '')) && (options.where?.vorhaben?.(r) ?? true),
      toItem: options.items?.vorhaben as never,
      claim: 'angebotsvarianten.vorhaben',
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:variante-erfassen:read:${entity}`);
  // a fixed value the flow sets itself, as a review row with the link that changes it
  const setting = (entity: EntityKey, field: string, value: unknown): SummaryItem => ({
    key: `setting:${entity}.${field}`, label: labelOf(entity, field),
    value: optionsOf(entity, field).find(o => o.key === String(value))?.label ?? String(value ?? ''),
    href: `#/verwaltung/anwendung?line=intent:variante-erfassen:write:${entity}.${field}`,
  });
  const picks = {
    vorhaben: { ...searches.vorhaben, select: { ...searches.vorhaben.select, create: false as boolean, hint: hintFor('vorhaben', 'angebotsvorhaben', {"conditions": [{"field": "phase", "op": "not_in", "value": ["angebot_abgegeben", "abgebrochen"]}], "mode": "all"} as PickWhere | null) } },
  };

  const plan: PlanStep[] = [
    {
      key: 'angebotsvarianten', entity: 'angebotsvarianten', form: angebotsvarianten, label: nounOne('angebotsvarianten', entityLabel('angebotsvarianten')), primary: true,
      values: (): FormValues => ({
        status: policyFixedValue('angebotsvarianten', 'status') ?? "entwurf",
      }),

      // the review shows what this step sets itself — changeable on „Deine Anwendung“, not here
      settings: () => [setting('angebotsvarianten', 'status', policyFixedValue('angebotsvarianten', 'status') ?? "entwurf")],
    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'variante-erfassen' });

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
    { const v = linkedParams.get('variantenbezeichnung'); if (v !== null && isEmptyValue(angebotsvarianten.get('variantenbezeichnung'))) (angebotsvarianten.set as (k: string, v: unknown) => void)('variantenbezeichnung', coerce(angebotsvarianten, 'variantenbezeichnung', v)); }
    { const v = linkedParams.get('beschreibung'); if (v !== null && isEmptyValue(angebotsvarianten.get('beschreibung'))) (angebotsvarianten.set as (k: string, v: unknown) => void)('beschreibung', coerce(angebotsvarianten, 'beschreibung', v)); }
    { const v = linkedParams.get('menge'); if (v !== null && isEmptyValue(angebotsvarianten.get('menge'))) (angebotsvarianten.set as (k: string, v: unknown) => void)('menge', coerce(angebotsvarianten, 'menge', v)); }
    { const v = linkedParams.get('teillieferung'); if (v !== null && isEmptyValue(angebotsvarianten.get('teillieferung'))) (angebotsvarianten.set as (k: string, v: unknown) => void)('teillieferung', coerce(angebotsvarianten, 'teillieferung', v)); }
    { const v = linkedParams.get('herstellkosten'); if (v !== null && isEmptyValue(angebotsvarianten.get('herstellkosten'))) (angebotsvarianten.set as (k: string, v: unknown) => void)('herstellkosten', coerce(angebotsvarianten, 'herstellkosten', v)); }
    { const v = linkedParams.get('beschaffungskosten'); if (v !== null && isEmptyValue(angebotsvarianten.get('beschaffungskosten'))) (angebotsvarianten.set as (k: string, v: unknown) => void)('beschaffungskosten', coerce(angebotsvarianten, 'beschaffungskosten', v)); }
    { const v = linkedParams.get('aufwand_stunden'); if (v !== null && isEmptyValue(angebotsvarianten.get('aufwand_stunden'))) (angebotsvarianten.set as (k: string, v: unknown) => void)('aufwand_stunden', coerce(angebotsvarianten, 'aufwand_stunden', v)); }
    { const v = linkedParams.get('angebotspreis'); if (v !== null && isEmptyValue(angebotsvarianten.get('angebotspreis'))) (angebotsvarianten.set as (k: string, v: unknown) => void)('angebotspreis', coerce(angebotsvarianten, 'angebotspreis', v)); }
    { const v = linkedParams.get('akzeptierte_risiken'); if (v !== null && isEmptyValue(angebotsvarianten.get('akzeptierte_risiken'))) (angebotsvarianten.set as (k: string, v: unknown) => void)('akzeptierte_risiken', coerce(angebotsvarianten, 'akzeptierte_risiken', v)); }
    { const v = linkedParams.get('vertragsbedingungen'); if (v !== null && isEmptyValue(angebotsvarianten.get('vertragsbedingungen'))) (angebotsvarianten.set as (k: string, v: unknown) => void)('vertragsbedingungen', coerce(angebotsvarianten, 'vertragsbedingungen', v)); }
    { const v = linkedParams.get('liefertermin'); if (v !== null && isEmptyValue(angebotsvarianten.get('liefertermin'))) (angebotsvarianten.set as (k: string, v: unknown) => void)('liefertermin', coerce(angebotsvarianten, 'liefertermin', v)); }
    {
      const cur = forms.angebotsvarianten.get('vorhaben');
      const fromLink = linkedParams.get('vorhaben');
      const unnamed = typeof cur === 'string' && cur !== '' && !forms.angebotsvarianten.labels[cur] ? cur : null;
      const id = fromLink && isEmptyValue(cur) ? fromLink : unnamed;
      if (id) void servicePort.get('angebotsvorhaben', id).then(rec => {
        if (!on || !rec) return;
        picks.vorhaben.adopt(rec);
        const name = picks.vorhaben.labelOf(rec.id) ?? rec.id;
        (forms.angebotsvarianten.set as (k: string, v: unknown, l?: string) => void)('vorhaben', rec.id, name);
        prefillFrom('vorhaben', rec);
      }).catch(() => undefined);
    }
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per link
  }, []);

  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: VarianteErfassenFieldKey) => {
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
  const pickMany = (field: VarianteErfassenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)));
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); };

  return {
    slug: 'variante-erfassen' as const,
    draftKey: 'variante-erfassen' as const,    entity: 'angebotsvarianten' as const,
    form: angebotsvarianten,
    forms, formList, picks, submit, steps,    reviewStep: VARIANTEERFASSEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,    // the door the hook reads through — for what it does not own: availability
    // (useOccupancy(flow.port, …)), a count (useRecordCount(flow.port, …)). A page
    // importing servicePort next to the hook fails gate 3 (fewo 05.10.2026: the
    // gate taught useOccupancy(servicePort, …) and forbade servicePort at once)
    port: servicePort,
  };
}

export type VarianteErfassenFlow = ReturnType<typeof useVarianteErfassenFlow>;
