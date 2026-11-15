/**
 * useFachbeitragErfassenFlow — the plumbing of the flow « Fachbeitrag erfassen », generated from the plan.
 *
 * Writes `fachbeitraege`: asks `autor`, `inhalt`, `aufgabe`, `variante`, `vorhaben`, `anforderung`, `bedingungen`, `gueltig_bis`, `gueltig_von`; sets `status` itself.
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
 *   const flow = useFachbeitragErfassenFlow({
 *     steps: { autor: 1, aufgabe: 2, variante: 3, vorhaben: 4, anforderung: 5, inhalt: 6, bedingungen: 6, gueltig_bis: 6, gueltig_von: 6 },
 *     items: { autor: r => ({ id: r.id, title: fieldText(r, 'vorname') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.autor.select} {...flow.pick('autor')} />
 *     <EntitySelectStep {...flow.picks.aufgabe.select} {...flow.pick('aufgabe')} />
 *     <EntitySelectStep {...flow.picks.variante.select} {...flow.pick('variante')} />
 *     <EntitySelectStep {...flow.picks.vorhaben.select} {...flow.pick('vorhaben')} />
 *     <EntitySelectStep {...flow.picks.anforderung.select} {...flow.pick('anforderung')} />
 *     <Bound form={flow.forms.fachbeitraege} name="inhalt" />
 *     <Bound form={flow.forms.fachbeitraege} name="bedingungen" />
 *     <Bound form={flow.forms.fachbeitraege} name="gueltig_bis" />
 *     <Bound form={flow.forms.fachbeitraege} name="gueltig_von" />
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

export type FachbeitragErfassenFieldKey = 'anforderung' | 'aufgabe' | 'autor' | 'bedingungen' | 'gueltig_bis' | 'gueltig_von' | 'inhalt' | 'variante' | 'vorhaben';

export interface FachbeitragErfassenForms {
  fachbeitraege: StepForm<'fachbeitraege'>;
}

// Alias so the option generics stay readable.
type Key = FachbeitragErfassenFieldKey;

export interface FachbeitragErfassenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    autor?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    aufgabe?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    variante?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    vorhaben?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    anforderung?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
  /** A page-side narrowing per pick, on top of the plan's filter (J-3): the
   *  questions of the picked event, the open ones — `r => fieldRef(r, 'veranstaltung') === eventId`. */
  where?: {
    autor?: (record: JourneyRecord) => boolean;
    aufgabe?: (record: JourneyRecord) => boolean;
    variante?: (record: JourneyRecord) => boolean;
    vorhaben?: (record: JourneyRecord) => boolean;
    anforderung?: (record: JourneyRecord) => boolean;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"anforderung": 5, "aufgabe": 2, "autor": 1, "bedingungen": 6, "gueltig_bis": 6, "gueltig_von": 6, "inhalt": 6, "variante": 3, "vorhaben": 4};
export const FACHBEITRAGERFASSEN_REVIEW_STEP = 7;
// a label of the plan in the page's language
function labelIn(m: Record<string, string>): string {
  const l = (typeof document !== 'undefined' ? document.documentElement.lang : '') || 'de';
  return m[l.slice(0, 2)] ?? m.de ?? Object.values(m)[0] ?? '';
}
// the ways this flow may END (plan: success.actions) — the review shows one
// button per entry, the chosen one sets these values on the primary record
const ACTION_SETS: Record<string, FormValues> = { 'beitrag-gueltig': {"status": "gueltig"} };

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

export function useFachbeitragErfassenFlow(options: FachbeitragErfassenFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const variantRef = useRef<string | null>(null);   // the end action the person chose (PV-14)
  const fachbeitraege = useStepForm('fachbeitraege', {
    fields: ["autor", "inhalt", "aufgabe", "variante", "vorhaben", "anforderung", "bedingungen", "gueltig_bis", "gueltig_von"],
    steps: only(steps, ["autor", "inhalt", "aufgabe", "variante", "vorhaben", "anforderung", "bedingungen", "gueltig_bis", "gueltig_von"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["autor", "inhalt", "aufgabe", "variante", "vorhaben", "anforderung", "bedingungen", "gueltig_bis", "gueltig_von"]),
    messages: only(options.messages as Record<string, string> | undefined, ["autor", "inhalt", "aufgabe", "variante", "vorhaben", "anforderung", "bedingungen", "gueltig_bis", "gueltig_von"]),
  });
  const forms: FachbeitragErfassenForms = { fachbeitraege };
  // the editor of a list is not a record of its own: the review and the success
  // page read the entries (PlanStep.review), never the half-filled editor
  const formList: StepForm[] = [fachbeitraege];
  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  // a pick that belongs to another pick's record (A9): server filter + its client twin
  const dependsOn = (dep: unknown, field: string) => (typeof dep === 'string' && /^[a-f0-9]{24}$/i.test(dep) ? refFilter(field, dep) : undefined);
  const dependsWhere = (r: JourneyRecord, field: string, dep: unknown) => typeof dep !== 'string' || dep === '' || fieldRef(r, field) === dep;
  const searches = {
    autor: useRecordSearch(servicePort, 'beteiligte', withPickPolicy('autor', {
      searchFields: ["vorname", "nachname"] as never,
      filter: "r.v_aktiv == True",
      where: (r: JourneyRecord) => (r.fields["aktiv"] === true) && (options.where?.autor?.(r) ?? true),
      toItem: options.items?.autor as never,
      claim: 'fachbeitraege.autor',
    })),
    aufgabe: useRecordSearch(servicePort, 'aufgaben', withPickPolicy('aufgabe', {
      searchFields: ["titel"] as never,
      // only the aufgaben of the autor picked before
      filter: combineFilters("r.v_status in ['geplant', 'aktiv', 'wartet']", dependsOn(fachbeitraege.get("autor"), 'verantwortlicher')),
      where: (r: JourneyRecord) => (["geplant", "aktiv", "wartet"].includes(fieldLookup(r, "status")?.key ?? '')) && dependsWhere(r, 'verantwortlicher', fachbeitraege.get("autor")) && (options.where?.aufgabe?.(r) ?? true),
      toItem: options.items?.aufgabe as never,
      claim: 'fachbeitraege.aufgabe',
    })),
    variante: useRecordSearch(servicePort, 'angebotsvarianten', withPickPolicy('variante', {
      searchFields: ["variantenbezeichnung"] as never,
      // only the angebotsvarianten of the vorhaben picked before
      filter: combineFilters("r.v_status not in ['verworfen']", dependsOn(fachbeitraege.get("vorhaben"), 'vorhaben')),
      where: (r: JourneyRecord) => (!["verworfen"].includes(fieldLookup(r, "status")?.key ?? '')) && dependsWhere(r, 'vorhaben', fachbeitraege.get("vorhaben")) && (options.where?.variante?.(r) ?? true),
      toItem: options.items?.variante as never,
      claim: 'fachbeitraege.variante',
    })),
    vorhaben: useRecordSearch(servicePort, 'angebotsvorhaben', withPickPolicy('vorhaben', {
      searchFields: ["bezeichnung", "kundenname"] as never,
      // only the angebotsvorhaben of the autor picked before
      filter: combineFilters("r.v_phase not in ['angebot_abgegeben', 'abgebrochen']", dependsOn(fachbeitraege.get("autor"), 'projektleitung')),
      where: (r: JourneyRecord) => (!["angebot_abgegeben", "abgebrochen"].includes(fieldLookup(r, "phase")?.key ?? '')) && dependsWhere(r, 'projektleitung', fachbeitraege.get("autor")) && (options.where?.vorhaben?.(r) ?? true),
      toItem: options.items?.vorhaben as never,
      claim: 'fachbeitraege.vorhaben',
    })),
    anforderung: useRecordSearch(servicePort, 'anforderungen', withPickPolicy('anforderung', {
      searchFields: ["titel"] as never,
      // only the anforderungen of the vorhaben picked before
      filter: combineFilters("r.v_status == 'gueltig'", dependsOn(fachbeitraege.get("vorhaben"), 'vorhaben')),
      where: (r: JourneyRecord) => ((fieldLookup(r, "status")?.key ?? null) === "gueltig") && dependsWhere(r, 'vorhaben', fachbeitraege.get("vorhaben")) && (options.where?.anforderung?.(r) ?? true),
      toItem: options.items?.anforderung as never,
      claim: 'fachbeitraege.anforderung',
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:fachbeitrag-erfassen:read:${entity}`);
  // a fixed value the flow sets itself, as a review row with the link that changes it
  const setting = (entity: EntityKey, field: string, value: unknown): SummaryItem => ({
    key: `setting:${entity}.${field}`, label: labelOf(entity, field),
    value: optionsOf(entity, field).find(o => o.key === String(value))?.label ?? String(value ?? ''),
    href: `#/verwaltung/anwendung?line=intent:fachbeitrag-erfassen:write:${entity}.${field}`,
  });
  const picks = {
    autor: { ...searches.autor, select: { ...searches.autor.select, create: false as boolean, hint: hintFor('autor', 'beteiligte', {"conditions": [{"field": "aktiv", "op": "eq", "value": "true"}], "mode": "all"} as PickWhere | null) } },
    aufgabe: { ...searches.aufgabe, select: { ...searches.aufgabe.select, create: false as boolean, hint: hintFor('aufgabe', 'aufgaben', {"conditions": [{"field": "status", "op": "in", "value": ["geplant", "aktiv", "wartet"]}], "mode": "all"} as PickWhere | null) } },
    variante: { ...searches.variante, select: { ...searches.variante.select, create: false as boolean, hint: hintFor('variante', 'angebotsvarianten', {"conditions": [{"field": "status", "op": "not_in", "value": ["verworfen"]}], "mode": "all"} as PickWhere | null) } },
    vorhaben: { ...searches.vorhaben, select: { ...searches.vorhaben.select, create: false as boolean, hint: hintFor('vorhaben', 'angebotsvorhaben', {"conditions": [{"field": "phase", "op": "not_in", "value": ["angebot_abgegeben", "abgebrochen"]}], "mode": "all"} as PickWhere | null) } },
    anforderung: { ...searches.anforderung, select: { ...searches.anforderung.select, create: false as boolean, hint: hintFor('anforderung', 'anforderungen', {"conditions": [{"field": "status", "op": "eq", "value": "gueltig"}], "mode": "all"} as PickWhere | null) } },
  };

  const plan: PlanStep[] = [
    {
      key: 'fachbeitraege', entity: 'fachbeitraege', form: fachbeitraege, label: nounOne('fachbeitraege', entityLabel('fachbeitraege')), primary: true,
      values: (): FormValues => ({
        status: policyFixedValue('fachbeitraege', 'status') ?? "entwurf",
        ...(variantRef.current ? ACTION_SETS[variantRef.current] ?? {} : {}),
      }),

      // the review shows what this step sets itself — changeable on „Deine Anwendung“, not here
      settings: () => [setting('fachbeitraege', 'status', policyFixedValue('fachbeitraege', 'status') ?? "entwurf")],
    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'fachbeitrag-erfassen' });

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
    { const v = linkedParams.get('inhalt'); if (v !== null && isEmptyValue(fachbeitraege.get('inhalt'))) (fachbeitraege.set as (k: string, v: unknown) => void)('inhalt', coerce(fachbeitraege, 'inhalt', v)); }
    { const v = linkedParams.get('bedingungen'); if (v !== null && isEmptyValue(fachbeitraege.get('bedingungen'))) (fachbeitraege.set as (k: string, v: unknown) => void)('bedingungen', coerce(fachbeitraege, 'bedingungen', v)); }
    { const v = linkedParams.get('gueltig_bis'); if (v !== null && isEmptyValue(fachbeitraege.get('gueltig_bis'))) (fachbeitraege.set as (k: string, v: unknown) => void)('gueltig_bis', coerce(fachbeitraege, 'gueltig_bis', v)); }
    { const v = linkedParams.get('gueltig_von'); if (v !== null && isEmptyValue(fachbeitraege.get('gueltig_von'))) (fachbeitraege.set as (k: string, v: unknown) => void)('gueltig_von', coerce(fachbeitraege, 'gueltig_von', v)); }
    {
      const cur = forms.fachbeitraege.get('autor');
      const fromLink = linkedParams.get('autor');
      const unnamed = typeof cur === 'string' && cur !== '' && !forms.fachbeitraege.labels[cur] ? cur : null;
      const id = fromLink && isEmptyValue(cur) ? fromLink : unnamed;
      if (id) void servicePort.get('beteiligte', id).then(rec => {
        if (!on || !rec) return;
        picks.autor.adopt(rec);
        const name = picks.autor.labelOf(rec.id) ?? rec.id;
        (forms.fachbeitraege.set as (k: string, v: unknown, l?: string) => void)('autor', rec.id, name);
        prefillFrom('autor', rec);
      }).catch(() => undefined);
    }
    {
      const cur = forms.fachbeitraege.get('aufgabe');
      const fromLink = linkedParams.get('aufgabe');
      const unnamed = typeof cur === 'string' && cur !== '' && !forms.fachbeitraege.labels[cur] ? cur : null;
      const id = fromLink && isEmptyValue(cur) ? fromLink : unnamed;
      if (id) void servicePort.get('aufgaben', id).then(rec => {
        if (!on || !rec) return;
        picks.aufgabe.adopt(rec);
        const name = picks.aufgabe.labelOf(rec.id) ?? rec.id;
        (forms.fachbeitraege.set as (k: string, v: unknown, l?: string) => void)('aufgabe', rec.id, name);
        prefillFrom('aufgabe', rec);
      }).catch(() => undefined);
    }
    {
      const cur = forms.fachbeitraege.get('variante');
      const fromLink = linkedParams.get('variante');
      const unnamed = typeof cur === 'string' && cur !== '' && !forms.fachbeitraege.labels[cur] ? cur : null;
      const id = fromLink && isEmptyValue(cur) ? fromLink : unnamed;
      if (id) void servicePort.get('angebotsvarianten', id).then(rec => {
        if (!on || !rec) return;
        picks.variante.adopt(rec);
        const name = picks.variante.labelOf(rec.id) ?? rec.id;
        (forms.fachbeitraege.set as (k: string, v: unknown, l?: string) => void)('variante', rec.id, name);
        prefillFrom('variante', rec);
      }).catch(() => undefined);
    }
    {
      const cur = forms.fachbeitraege.get('vorhaben');
      const fromLink = linkedParams.get('vorhaben');
      const unnamed = typeof cur === 'string' && cur !== '' && !forms.fachbeitraege.labels[cur] ? cur : null;
      const id = fromLink && isEmptyValue(cur) ? fromLink : unnamed;
      if (id) void servicePort.get('angebotsvorhaben', id).then(rec => {
        if (!on || !rec) return;
        picks.vorhaben.adopt(rec);
        const name = picks.vorhaben.labelOf(rec.id) ?? rec.id;
        (forms.fachbeitraege.set as (k: string, v: unknown, l?: string) => void)('vorhaben', rec.id, name);
        prefillFrom('vorhaben', rec);
      }).catch(() => undefined);
    }
    {
      const cur = forms.fachbeitraege.get('anforderung');
      const fromLink = linkedParams.get('anforderung');
      const unnamed = typeof cur === 'string' && cur !== '' && !forms.fachbeitraege.labels[cur] ? cur : null;
      const id = fromLink && isEmptyValue(cur) ? fromLink : unnamed;
      if (id) void servicePort.get('anforderungen', id).then(rec => {
        if (!on || !rec) return;
        picks.anforderung.adopt(rec);
        const name = picks.anforderung.labelOf(rec.id) ?? rec.id;
        (forms.fachbeitraege.set as (k: string, v: unknown, l?: string) => void)('anforderung', rec.id, name);
        prefillFrom('anforderung', rec);
      }).catch(() => undefined);
    }
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per link
  }, []);

  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: FachbeitragErfassenFieldKey) => {
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
  const pickMany = (field: FachbeitragErfassenFieldKey) => {
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
    { id: 'beitrag-gueltig', label: labelIn({"de": "Sofort auf G\u00fcltig setzen", "en": "Set to valid immediately"}), confirm: () => { variantRef.current = 'beitrag-gueltig'; return submit.run(); } },
  ];
  return {
    slug: 'fachbeitrag-erfassen' as const,
    draftKey: 'fachbeitrag-erfassen' as const,    actions: flowActions,    entity: 'fachbeitraege' as const,
    form: fachbeitraege,
    forms, formList, picks, submit, steps,    reviewStep: FACHBEITRAGERFASSEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,    // the door the hook reads through — for what it does not own: availability
    // (useOccupancy(flow.port, …)), a count (useRecordCount(flow.port, …)). A page
    // importing servicePort next to the hook fails gate 3 (fewo 05.10.2026: the
    // gate taught useOccupancy(servicePort, …) and forbade servicePort at once)
    port: servicePort,
  };
}

export type FachbeitragErfassenFlow = ReturnType<typeof useFachbeitragErfassenFlow>;
