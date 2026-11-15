/**
 * AbhaengigkeitenDialog — pre-generated create/edit dialog for Abhaengigkeiten.
 *
 * Props: open, onClose, onSubmit(fields) => Promise<void>, defaultValues?,
 * recordId? (pass when EDITING — enables the attachments section),
 * angebotsvorhabenList (full hook array — resolves the Angebotsvorhaben applookup),
 * aufgabenList (full hook array — resolves the Aufgaben applookup),
 * angebotsvariantenList (full hook array — resolves the Angebotsvarianten applookup),
 * anforderungenList (full hook array — resolves the Anforderungen applookup),
 * fachbeitraegeList (full hook array — resolves the Fachbeitraege applookup),
 * enablePhotoScan?, enablePhotoLocation?.
 *
 * defaultValues is SHAPE-TOLERANT and its prop type is the EXPORTED
 * AbhaengigkeitenDialogDefaults — NOT the entity field type: lookup fields accept
 * the bare KEY string (or LookupValue), applookup fields the bare record id
 * (or record URL); the dialog normalizes. Type prefill STATE with the export:
 *  ❌ useState<Partial<Abhaengigkeiten['fields']>>({ … })   // LookupValue fields reject string prefills (TS2322)
 *  ✓ useState<AbhaengigkeitenDialogDefaults | undefined>(undefined)
 */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Abhaengigkeiten, Angebotsvorhaben, Aufgaben, Angebotsvarianten, Anforderungen, Fachbeitraege, LookupValue } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, getUserProfile, LivingAppsService } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ComputedContext } from '@/config/form-enhancements/types';
import { applyFieldOrder, flattenFieldOrder, applyDefaults, evalComputed, numberInputProps, clampNumberValue, classifyComputed, extractApplookupRefs, mergeApplookupRefs, resolveApplookupRef, dialogLabel, dropHidden } from '@/config/form-enhancements/types';
import { formEnhancements, computedDeps, computedApplookupRefs } from '@/config/form-enhancements/Abhaengigkeiten';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { requiredMessage } from '@/lib/journey/messages';
import { displayNameOf } from '@/lib/journey/rules';
import { t, appLabel, fieldLabel, lookupLabel, localeTag, CURRENCY } from '@/i18n';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/Combobox';
import { AngebotsvorhabenDialog } from '@/components/dialogs/AngebotsvorhabenDialog';
import { AufgabenDialog } from '@/components/dialogs/AufgabenDialog';
import { AngebotsvariantenDialog } from '@/components/dialogs/AngebotsvariantenDialog';
import { AnforderungenDialog } from '@/components/dialogs/AnforderungenDialog';
import { FachbeitraegeDialog } from '@/components/dialogs/FachbeitraegeDialog';
import { DatePicker } from '@/components/DatePicker';
import { Checkbox } from '@/components/ui/checkbox';
import { IconAlertCircle, IconCamera, IconChevronDown, IconCircleCheck, IconClipboard, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromInput, extractPhotoMeta, reverseGeocode } from '@/lib/ai';
import { lookupKey } from '@/lib/formatters';

/** Widened prefill type for AbhaengigkeitenDialog.defaultValues — see file header. */
export type AbhaengigkeitenDialogDefaults = Omit<Abhaengigkeiten['fields'], 'grundlage_art' | 'pruefung_status'> & {
    grundlage_art?: LookupValue | string;
    pruefung_status?: LookupValue | string;
  };

interface AbhaengigkeitenDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Abhaengigkeiten['fields']) => Promise<void>;
  /** SHAPE-TOLERANT: lookup fields accept the bare key (string) or the
   *  LookupValue object; applookup fields the bare record id or the full
   *  record URL — the dialog normalizes both. */
  defaultValues?: AbhaengigkeitenDialogDefaults;
  /** Record id when editing — enables the attachments section. Omit on create. */
  recordId?: string;
  angebotsvorhabenList: Angebotsvorhaben[];
  aufgabenList: Aufgaben[];
  angebotsvariantenList: Angebotsvarianten[];
  anforderungenList: Anforderungen[];
  fachbeitraegeList: Fachbeitraege[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

// defaultValues are SHAPE-TOLERANT: the dialog resolves bare lookup keys via
// its own options and bare record ids via the field's target app — consumers
// never carry the LookupValue/record-URL shape in their head.
const NORMALIZE_LOOKUPS: Record<string, readonly { key: string; label: string }[]> = {
  grundlage_art: LOOKUP_OPTIONS['abhaengigkeiten']?.['grundlage_art'] ?? [],
  pruefung_status: LOOKUP_OPTIONS['abhaengigkeiten']?.['pruefung_status'] ?? [],
};
const NORMALIZE_APPLOOKUPS: Record<string, string> = {
  vorhaben: APP_IDS.ANGEBOTSVORHABEN,
  abhaengige_aufgabe: APP_IDS.AUFGABEN,
  grundlage_variante: APP_IDS.ANGEBOTSVARIANTEN,
  grundlage_aufgabe: APP_IDS.AUFGABEN,
  grundlage_anforderung: APP_IDS.ANFORDERUNGEN,
  grundlage_beitrag: APP_IDS.FACHBEITRAEGE,
};
function normalizeDefaults(values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...values };
  for (const [k, opts] of Object.entries(NORMALIZE_LOOKUPS)) {
    const v = out[k];
    if (typeof v === 'string') out[k] = opts.find(o => o.key === v) ?? { key: v, label: v };
    else if (Array.isArray(v)) out[k] = v.map(x => (typeof x === 'string' ? opts.find(o => o.key === x) ?? { key: x, label: x } : x));
  }
  for (const [k, appId] of Object.entries(NORMALIZE_APPLOOKUPS)) {
    const v = out[k];
    if (typeof v === 'string' && v !== '' && !v.startsWith('http')) out[k] = createRecordUrl(appId, v);
    else if (Array.isArray(v)) out[k] = v.map(x => (typeof x === 'string' && x !== '' && !x.startsWith('http') ? createRecordUrl(appId, x) : x));
  }
  return out;
}

export function AbhaengigkeitenDialog({ open, onClose, onSubmit, defaultValues, recordId, angebotsvorhabenList, aufgabenList, angebotsvariantenList, anforderungenList, fachbeitraegeList, enablePhotoScan = true, enablePhotoLocation = true }: AbhaengigkeitenDialogProps) {
  const [fields, setFields] = useState<Partial<Abhaengigkeiten['fields']>>({});
  const [saving, setSaving] = useState(false);
  const normalizedDefaults = useMemo<Record<string, unknown> | undefined>(
    () => (defaultValues ? normalizeDefaults(defaultValues as Record<string, unknown>) : undefined),
    [defaultValues],
  );
  // Dirty-tracking: in edit-mode the Speichern button is disabled until the
  // user actually changes something. JSON.stringify is good enough for our
  // fields (plain values + LookupValue objects + string arrays).
  const isDirty = useMemo(() => {
    if (!normalizedDefaults) return true;  // create-mode: always allow submit
    try {
      return JSON.stringify(fields) !== JSON.stringify(normalizedDefaults);
    } catch {
      return true;
    }
  }, [fields, normalizedDefaults]);
  // Inline-Create state for "Angebotsvorhaben" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraAngebotsvorhaben` list, and select it in
  // the originating Combobox via the captured `createAngebotsvorhabenField`.
  const [createAngebotsvorhabenOpen, setCreateAngebotsvorhabenOpen] = useState(false);
  const [createAngebotsvorhabenInitial, setCreateAngebotsvorhabenInitial] = useState('');
  const [createAngebotsvorhabenField, setCreateAngebotsvorhabenField] = useState<string>('');
  const [extraAngebotsvorhaben, setExtraAngebotsvorhaben] = useState< Angebotsvorhaben[]>([]);
  const angebotsvorhabenListAll = useMemo(
    () => [...angebotsvorhabenList, ...extraAngebotsvorhaben],
    [angebotsvorhabenList, extraAngebotsvorhaben],
  );
  function openCreateAngebotsvorhaben(fieldKey: string, q: string) {
    setCreateAngebotsvorhabenField(fieldKey);
    setCreateAngebotsvorhabenInitial(q);
    setCreateAngebotsvorhabenOpen(true);
  }
  // Inline-Create state for "Aufgaben" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraAufgaben` list, and select it in
  // the originating Combobox via the captured `createAufgabenField`.
  const [createAufgabenOpen, setCreateAufgabenOpen] = useState(false);
  const [createAufgabenInitial, setCreateAufgabenInitial] = useState('');
  const [createAufgabenField, setCreateAufgabenField] = useState<string>('');
  const [extraAufgaben, setExtraAufgaben] = useState< Aufgaben[]>([]);
  const aufgabenListAll = useMemo(
    () => [...aufgabenList, ...extraAufgaben],
    [aufgabenList, extraAufgaben],
  );
  function openCreateAufgaben(fieldKey: string, q: string) {
    setCreateAufgabenField(fieldKey);
    setCreateAufgabenInitial(q);
    setCreateAufgabenOpen(true);
  }
  // Inline-Create state for "Angebotsvarianten" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraAngebotsvarianten` list, and select it in
  // the originating Combobox via the captured `createAngebotsvariantenField`.
  const [createAngebotsvariantenOpen, setCreateAngebotsvariantenOpen] = useState(false);
  const [createAngebotsvariantenInitial, setCreateAngebotsvariantenInitial] = useState('');
  const [createAngebotsvariantenField, setCreateAngebotsvariantenField] = useState<string>('');
  const [extraAngebotsvarianten, setExtraAngebotsvarianten] = useState< Angebotsvarianten[]>([]);
  const angebotsvariantenListAll = useMemo(
    () => [...angebotsvariantenList, ...extraAngebotsvarianten],
    [angebotsvariantenList, extraAngebotsvarianten],
  );
  function openCreateAngebotsvarianten(fieldKey: string, q: string) {
    setCreateAngebotsvariantenField(fieldKey);
    setCreateAngebotsvariantenInitial(q);
    setCreateAngebotsvariantenOpen(true);
  }
  // Inline-Create state for "Anforderungen" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraAnforderungen` list, and select it in
  // the originating Combobox via the captured `createAnforderungenField`.
  const [createAnforderungenOpen, setCreateAnforderungenOpen] = useState(false);
  const [createAnforderungenInitial, setCreateAnforderungenInitial] = useState('');
  const [createAnforderungenField, setCreateAnforderungenField] = useState<string>('');
  const [extraAnforderungen, setExtraAnforderungen] = useState< Anforderungen[]>([]);
  const anforderungenListAll = useMemo(
    () => [...anforderungenList, ...extraAnforderungen],
    [anforderungenList, extraAnforderungen],
  );
  function openCreateAnforderungen(fieldKey: string, q: string) {
    setCreateAnforderungenField(fieldKey);
    setCreateAnforderungenInitial(q);
    setCreateAnforderungenOpen(true);
  }
  // Inline-Create state for "Fachbeitraege" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraFachbeitraege` list, and select it in
  // the originating Combobox via the captured `createFachbeitraegeField`.
  const [createFachbeitraegeOpen, setCreateFachbeitraegeOpen] = useState(false);
  const [createFachbeitraegeInitial, setCreateFachbeitraegeInitial] = useState('');
  const [createFachbeitraegeField, setCreateFachbeitraegeField] = useState<string>('');
  const [extraFachbeitraege, setExtraFachbeitraege] = useState< Fachbeitraege[]>([]);
  const fachbeitraegeListAll = useMemo(
    () => [...fachbeitraegeList, ...extraFachbeitraege],
    [fachbeitraegeList, extraFachbeitraege],
  );
  function openCreateFachbeitraege(fieldKey: string, q: string) {
    setCreateFachbeitraegeField(fieldKey);
    setCreateFachbeitraegeInitial(q);
    setCreateFachbeitraegeOpen(true);
  }
  // Fields the plan assigns to a tool (empty without a plan).
  const SYSTEM_ASSIGNED: string[] = [];
  const PLAN_CREATE_PRESETS: Record<string, unknown> = {};
  const [showErrors, setShowErrors] = useState(false);
  const REQUIRED_FIELDS = ['vorhaben', 'abhaengige_aufgabe', 'grundlage_art', 'pruefung_status'] as const;
  const missingRequired = REQUIRED_FIELDS.filter(k => {
    const v = (fields as Record<string, unknown>)[k];
    return v == null || v === '' || (Array.isArray(v) && v.length === 0);
  });
  const [aiOpen, setAiOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [usePersonalInfo, setUsePersonalInfo] = useState(() => {
    try { return localStorage.getItem('ai-use-personal-info') === 'true'; } catch { return false; }
  });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [aiText, setAiText] = useState('');

  // Computed-field plumbing. Pure no-op when formEnhancements.computed is {}.
  // The number renderer uses computedValues only as a fallback when the user
  // hasn't typed anything — clearing the input always restores the computation.
  // computedContext exposes applookup list props so { kind: 'applookup', ... }
  // operands can resolve to numeric fields on the target record.
  const computedContext = useMemo<ComputedContext>(() => ({
    lookupLists: {
      'vorhaben': angebotsvorhabenList,
      'abhaengige_aufgabe': aufgabenList,
      'grundlage_variante': angebotsvariantenList,
      'grundlage_aufgabe': aufgabenList,
      'grundlage_anforderung': anforderungenList,
      'grundlage_beitrag': fachbeitraegeList,
    },
  }), [angebotsvorhabenList, aufgabenList, angebotsvariantenList, aufgabenList, anforderungenList, fachbeitraegeList, ]);
  const computedValues = useMemo<Record<string, number | null>>(() => {
    let out: Record<string, number | null> = {};
    const entries = Object.entries(formEnhancements.computed);
    for (let i = 0; i < 5; i++) {
      const merged: Record<string, unknown> = { ...(fields as Record<string, unknown>) };
      for (const [k, v] of Object.entries(out)) {
        if (v === null) continue;
        const cur = merged[k];
        if (cur === undefined || cur === null || cur === '') merged[k] = v;
      }
      const next: Record<string, number | null> = {};
      let changed = false;
      for (const [key, spec] of entries) {
        const v = evalComputed(spec, merged, computedContext);
        next[key] = v;
        if (v !== out[key]) changed = true;
      }
      out = next;
      if (!changed) break;
    }
    return out;
  }, [fields, computedContext]);

  useEffect(() => {
    if (open) {
      setFields(applyDefaults({ ...(recordId ? {} : normalizeDefaults(PLAN_CREATE_PRESETS)), ...(normalizedDefaults ?? {}) }, formEnhancements.defaults) as Partial<Abhaengigkeiten['fields']>);
      setPreview(null);
      setScanSuccess(false);
      setAiText('');
      setSubmitError(null);
    }
  }, [open, normalizedDefaults]);
  useEffect(() => {
    try { localStorage.setItem('ai-use-personal-info', String(usePersonalInfo)); } catch {}
  }, [usePersonalInfo]);
  async function handleShowProfileInfo() {
    if (showProfileInfo) { setShowProfileInfo(false); return; }
    setProfileLoading(true);
    try {
      const p = await getUserProfile();
      setProfileData(p);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
      setShowProfileInfo(true);
    }
  }

  // Submit errors surface IN the dialog (it is modal — a banner in the page
  // body would be hidden behind it). A consumer onSubmit that THROWS (the
  // documented "throw to prevent closing" validation pattern) lands here:
  // the dialog stays open, nothing is saved, the message is visible.
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (missingRequired.length > 0) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    setSubmitError(null);
    try {
      // Fill empty number slots from computed values; user-typed values always win.
      // CRITICAL: only backend-mapped keys may be backfilled. Virtual computeds
      // (sub-agent invents `_netto`, `_bestellung_gesamtbetrag` etc. for the
      // "Berechnungen" display) have no backend counterpart — writing them
      // triggers a 422 from the Living-Apps API ("field does not exist").
      const merged = { ...fields };
      for (const [key, val] of Object.entries(computedValues)) {
        if (val === null) continue;
        if (!backendFieldSet.has(key)) continue;
        const cur = (merged as Record<string, unknown>)[key];
        if (cur === undefined || cur === null || cur === '') {
          (merged as Record<string, unknown>)[key] = val;
        }
      }
      const clean = cleanFieldsForApi(merged, 'abhaengigkeiten');
      await onSubmit(clean as Abhaengigkeiten['fields']);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error && err.message ? err.message : t('submit_error'));
    } finally {
      setSaving(false);
    }
  }

  async function handleAiExtract(file?: File) {
    if (!file && !aiText.trim()) return;
    setScanning(true);
    setScanSuccess(false);
    try {
      let uri: string | undefined;
      let gps: { latitude: number; longitude: number } | null = null;
      let geoAddr = '';
      const parts: string[] = [];
      if (file) {
        const [dataUri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
        uri = dataUri;
        if (file.type.startsWith('image/')) setPreview(uri);
        gps = enablePhotoLocation ? meta?.gps ?? null : null;
        if (gps) {
          geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
          parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
          if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
        }
        if (meta?.dateTime) {
          parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
        }
      }
      const contextParts: string[] = [];
      if (parts.length) {
        contextParts.push(`<photo-metadata>\nThe following metadata was extracted from the photo\'s EXIF data:\n${parts.join('\n')}\n</photo-metadata>`);
      }
      contextParts.push(`<available-records field="vorhaben" entity="Angebotsvorhaben">\n${JSON.stringify(angebotsvorhabenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="abhaengige_aufgabe" entity="Aufgaben">\n${JSON.stringify(aufgabenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="grundlage_variante" entity="Angebotsvarianten">\n${JSON.stringify(angebotsvariantenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="grundlage_aufgabe" entity="Aufgaben">\n${JSON.stringify(aufgabenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="grundlage_anforderung" entity="Anforderungen">\n${JSON.stringify(anforderungenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="grundlage_beitrag" entity="Fachbeiträge">\n${JSON.stringify(fachbeitraegeList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "vorhaben": string | null, // Display name from Angebotsvorhaben (see <available-records>)\n  "abhaengige_aufgabe": string | null, // Display name from Aufgaben (see <available-records>)\n  "grundlage_art": LookupValue | null, // Grundlage ist (select one key: "anforderung" | "beitrag" | "variante" | "aufgabe") mapping: anforderung=Anforderung, beitrag=Fachbeitrag, variante=Angebotsvariante, aufgabe=Andere Aufgabe\n  "grundlage_variante": string | null, // Display name from Angebotsvarianten (see <available-records>)\n  "grundlage_aufgabe": string | null, // Display name from Aufgaben (see <available-records>)\n  "aenderung": string | null, // Änderung an der Grundlage\n  "pruefung_noetig": boolean | null, // Erneute Prüfung erforderlich\n  "pruefung_status": LookupValue | null, // Stand der Prüfung (select one key: "aktuell" | "offen" | "geprueft") mapping: aktuell=Aktuell, keine Prüfung nötig, offen=Prüfung offen, geprueft=Erneut geprüft\n  "grundlage_anforderung": string | null, // Display name from Anforderungen (see <available-records>)\n  "grundlage_beitrag": string | null, // Display name from Fachbeiträge (see <available-records>)\n  "geprueft_am": string | null, // YYYY-MM-DD\n}`;
      const raw = await extractFromInput<Record<string, unknown>>(schema, {
        dataUri: uri,
        userText: aiText.trim() || undefined,
        photoContext,
        intent: DIALOG_INTENT,
      });
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["vorhaben", "abhaengige_aufgabe", "grundlage_variante", "grundlage_aufgabe", "grundlage_anforderung", "grundlage_beitrag"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const vorhabenName = raw['vorhaben'] as string | null;
        if (vorhabenName) {
          const vorhabenMatch = angebotsvorhabenList.find(r => matchName(vorhabenName!, [String(r.fields.bezeichnung ?? '')]));
          if (vorhabenMatch) merged['vorhaben'] = createRecordUrl(APP_IDS.ANGEBOTSVORHABEN, vorhabenMatch.record_id);
        }
        const abhaengige_aufgabeName = raw['abhaengige_aufgabe'] as string | null;
        if (abhaengige_aufgabeName) {
          const abhaengige_aufgabeMatch = aufgabenList.find(r => matchName(abhaengige_aufgabeName!, [String(r.fields.titel ?? '')]));
          if (abhaengige_aufgabeMatch) merged['abhaengige_aufgabe'] = createRecordUrl(APP_IDS.AUFGABEN, abhaengige_aufgabeMatch.record_id);
        }
        const grundlage_varianteName = raw['grundlage_variante'] as string | null;
        if (grundlage_varianteName) {
          const grundlage_varianteMatch = angebotsvariantenList.find(r => matchName(grundlage_varianteName!, [String(r.fields.variantenbezeichnung ?? '')]));
          if (grundlage_varianteMatch) merged['grundlage_variante'] = createRecordUrl(APP_IDS.ANGEBOTSVARIANTEN, grundlage_varianteMatch.record_id);
        }
        const grundlage_aufgabeName = raw['grundlage_aufgabe'] as string | null;
        if (grundlage_aufgabeName) {
          const grundlage_aufgabeMatch = aufgabenList.find(r => matchName(grundlage_aufgabeName!, [String(r.fields.titel ?? '')]));
          if (grundlage_aufgabeMatch) merged['grundlage_aufgabe'] = createRecordUrl(APP_IDS.AUFGABEN, grundlage_aufgabeMatch.record_id);
        }
        const grundlage_anforderungName = raw['grundlage_anforderung'] as string | null;
        if (grundlage_anforderungName) {
          const grundlage_anforderungMatch = anforderungenList.find(r => matchName(grundlage_anforderungName!, [String(r.fields.titel ?? '')]));
          if (grundlage_anforderungMatch) merged['grundlage_anforderung'] = createRecordUrl(APP_IDS.ANFORDERUNGEN, grundlage_anforderungMatch.record_id);
        }
        const grundlage_beitragName = raw['grundlage_beitrag'] as string | null;
        if (grundlage_beitragName) {
          const grundlage_beitragMatch = fachbeitraegeList.find(r => matchName(grundlage_beitragName!, [String(r.fields.inhalt ?? '')]));
          if (grundlage_beitragMatch) merged['grundlage_beitrag'] = createRecordUrl(APP_IDS.FACHBEITRAEGE, grundlage_beitragMatch.record_id);
        }
        return merged as Partial<Abhaengigkeiten['fields']>;
      });
      setAiText('');
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error(`${t('scan_error')}:`, err);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleAiExtract(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handleAiExtract(file);
    }
  }, []);

  // EDIT is a record, not a prefill: openCreate(defaults) used to read „bearbeiten“
  // (acceptance 4, L-42) because the title keyed on defaultValues
  const DIALOG_INTENT = recordId
    ? (formEnhancements.title?.edit ?? t('edit_entity', { entity: appLabel('abhaengigkeiten') }))
    : (formEnhancements.title?.create ?? t('new_entity', { entity: appLabel('abhaengigkeiten') }));
  // the dialog's word for a field — the config may rename it (S-3)
  const labelFor = (k: string) => dialogLabel(formEnhancements, k, fieldLabel('abhaengigkeiten', k));

  const fieldBlocks: Record<string, React.ReactNode> = {
    'vorhaben': (
      <div key="vorhaben" className="space-y-1.5">
        <Label htmlFor="vorhaben">{labelFor('vorhaben')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <Combobox
          id="vorhaben"
          placeholder=""
          items={angebotsvorhabenListAll.map(r => ({
            id: r.record_id,
            label: displayNameOf('angebotsvorhaben', r.fields as Record<string, unknown>) || r.record_id,
          }))}
          value={extractRecordId(fields.vorhaben)}
          onChange={id => setFields(f => ({ ...f, vorhaben: id ? createRecordUrl(APP_IDS.ANGEBOTSVORHABEN, id) : undefined }))}
          onCreateNew={(q) => openCreateAngebotsvorhaben("vorhaben", q)}
          createLabel={t('create_in', { entity: appLabel('angebotsvorhaben') })}
        />
        {showErrors && !fields.vorhaben && (
          <p className="text-xs text-destructive mt-1" role="alert">{requiredMessage('abhaengigkeiten', 'vorhaben')}</p>
        )}
      </div>
    ),
    'abhaengige_aufgabe': (
      <div key="abhaengige_aufgabe" className="space-y-1.5">
        <Label htmlFor="abhaengige_aufgabe">{labelFor('abhaengige_aufgabe')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <Combobox
          id="abhaengige_aufgabe"
          placeholder=""
          items={aufgabenListAll.map(r => ({
            id: r.record_id,
            label: displayNameOf('aufgaben', r.fields as Record<string, unknown>) || r.record_id,
          }))}
          value={extractRecordId(fields.abhaengige_aufgabe)}
          onChange={id => setFields(f => ({ ...f, abhaengige_aufgabe: id ? createRecordUrl(APP_IDS.AUFGABEN, id) : undefined }))}
          onCreateNew={(q) => openCreateAufgaben("abhaengige_aufgabe", q)}
          createLabel={t('create_in', { entity: appLabel('aufgaben') })}
        />
        {showErrors && !fields.abhaengige_aufgabe && (
          <p className="text-xs text-destructive mt-1" role="alert">{requiredMessage('abhaengigkeiten', 'abhaengige_aufgabe')}</p>
        )}
      </div>
    ),
    'grundlage_art': (
      <div key="grundlage_art" className="space-y-1.5">
        <Label htmlFor="grundlage_art">{labelFor('grundlage_art')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <div role="radiogroup" className="flex flex-wrap gap-1.5">
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.grundlage_art) === 'anforderung'}
            onClick={() => setFields(f => ({ ...f, grundlage_art: (lookupKey(f.grundlage_art) === 'anforderung' ? undefined : 'anforderung') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.grundlage_art) === 'anforderung'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('abhaengigkeiten', 'grundlage_art', 'anforderung') ?? 'Anforderung'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.grundlage_art) === 'beitrag'}
            onClick={() => setFields(f => ({ ...f, grundlage_art: (lookupKey(f.grundlage_art) === 'beitrag' ? undefined : 'beitrag') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.grundlage_art) === 'beitrag'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('abhaengigkeiten', 'grundlage_art', 'beitrag') ?? 'Fachbeitrag'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.grundlage_art) === 'variante'}
            onClick={() => setFields(f => ({ ...f, grundlage_art: (lookupKey(f.grundlage_art) === 'variante' ? undefined : 'variante') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.grundlage_art) === 'variante'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('abhaengigkeiten', 'grundlage_art', 'variante') ?? 'Angebotsvariante'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.grundlage_art) === 'aufgabe'}
            onClick={() => setFields(f => ({ ...f, grundlage_art: (lookupKey(f.grundlage_art) === 'aufgabe' ? undefined : 'aufgabe') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.grundlage_art) === 'aufgabe'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('abhaengigkeiten', 'grundlage_art', 'aufgabe') ?? 'Andere Aufgabe'}
          </button>
        </div>
        {showErrors && !fields.grundlage_art && (
          <p className="text-xs text-destructive mt-1" role="alert">{requiredMessage('abhaengigkeiten', 'grundlage_art')}</p>
        )}
      </div>
    ),
    'grundlage_variante': (
      <div key="grundlage_variante" className="space-y-1.5">
        <Label htmlFor="grundlage_variante">{labelFor('grundlage_variante')}</Label>
        <Combobox
          id="grundlage_variante"
          placeholder=""
          items={angebotsvariantenListAll.map(r => ({
            id: r.record_id,
            label: displayNameOf('angebotsvarianten', r.fields as Record<string, unknown>) || r.record_id,
          }))}
          value={extractRecordId(fields.grundlage_variante)}
          onChange={id => setFields(f => ({ ...f, grundlage_variante: id ? createRecordUrl(APP_IDS.ANGEBOTSVARIANTEN, id) : undefined }))}
          onCreateNew={(q) => openCreateAngebotsvarianten("grundlage_variante", q)}
          createLabel={t('create_in', { entity: appLabel('angebotsvarianten') })}
        />
      </div>
    ),
    'grundlage_aufgabe': (
      <div key="grundlage_aufgabe" className="space-y-1.5">
        <Label htmlFor="grundlage_aufgabe">{labelFor('grundlage_aufgabe')}</Label>
        <Combobox
          id="grundlage_aufgabe"
          placeholder=""
          items={aufgabenListAll.map(r => ({
            id: r.record_id,
            label: displayNameOf('aufgaben', r.fields as Record<string, unknown>) || r.record_id,
          }))}
          value={extractRecordId(fields.grundlage_aufgabe)}
          onChange={id => setFields(f => ({ ...f, grundlage_aufgabe: id ? createRecordUrl(APP_IDS.AUFGABEN, id) : undefined }))}
          onCreateNew={(q) => openCreateAufgaben("grundlage_aufgabe", q)}
          createLabel={t('create_in', { entity: appLabel('aufgaben') })}
        />
      </div>
    ),
    'aenderung': (
      <div key="aenderung" className="space-y-1.5">
        <Label htmlFor="aenderung">{labelFor('aenderung')}</Label>
        <Textarea
          id="aenderung"
          placeholder=""
          value={fields.aenderung ?? ''}
          onChange={e => setFields(f => ({ ...f, aenderung: e.target.value }))}
          rows={3}
        />
      </div>
    ),
    'pruefung_noetig': (
      <div key="pruefung_noetig" className="space-y-1.5">
        <Label htmlFor="pruefung_noetig">{labelFor('pruefung_noetig')}</Label>
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id="pruefung_noetig"
            checked={!!fields.pruefung_noetig}
            onCheckedChange={(v) => setFields(f => ({ ...f, pruefung_noetig: !!v }))}
          />
          <Label htmlFor="pruefung_noetig" className="font-normal">{labelFor('pruefung_noetig')}</Label>
        </div>
      </div>
    ),
    'pruefung_status': (
      <div key="pruefung_status" className="space-y-1.5">
        <Label htmlFor="pruefung_status">{labelFor('pruefung_status')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <div role="radiogroup" className="flex flex-wrap gap-1.5">
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.pruefung_status) === 'aktuell'}
            onClick={() => setFields(f => ({ ...f, pruefung_status: (lookupKey(f.pruefung_status) === 'aktuell' ? undefined : 'aktuell') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.pruefung_status) === 'aktuell'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('abhaengigkeiten', 'pruefung_status', 'aktuell') ?? 'Aktuell, keine Prüfung nötig'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.pruefung_status) === 'offen'}
            onClick={() => setFields(f => ({ ...f, pruefung_status: (lookupKey(f.pruefung_status) === 'offen' ? undefined : 'offen') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.pruefung_status) === 'offen'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('abhaengigkeiten', 'pruefung_status', 'offen') ?? 'Prüfung offen'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.pruefung_status) === 'geprueft'}
            onClick={() => setFields(f => ({ ...f, pruefung_status: (lookupKey(f.pruefung_status) === 'geprueft' ? undefined : 'geprueft') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.pruefung_status) === 'geprueft'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('abhaengigkeiten', 'pruefung_status', 'geprueft') ?? 'Erneut geprüft'}
          </button>
        </div>
        {showErrors && !fields.pruefung_status && (
          <p className="text-xs text-destructive mt-1" role="alert">{requiredMessage('abhaengigkeiten', 'pruefung_status')}</p>
        )}
      </div>
    ),
    'grundlage_anforderung': (
      <div key="grundlage_anforderung" className="space-y-1.5">
        <Label htmlFor="grundlage_anforderung">{labelFor('grundlage_anforderung')}</Label>
        <Combobox
          id="grundlage_anforderung"
          placeholder=""
          items={anforderungenListAll.map(r => ({
            id: r.record_id,
            label: displayNameOf('anforderungen', r.fields as Record<string, unknown>) || r.record_id,
          }))}
          value={extractRecordId(fields.grundlage_anforderung)}
          onChange={id => setFields(f => ({ ...f, grundlage_anforderung: id ? createRecordUrl(APP_IDS.ANFORDERUNGEN, id) : undefined }))}
          onCreateNew={(q) => openCreateAnforderungen("grundlage_anforderung", q)}
          createLabel={t('create_in', { entity: appLabel('anforderungen') })}
        />
      </div>
    ),
    'grundlage_beitrag': (
      <div key="grundlage_beitrag" className="space-y-1.5">
        <Label htmlFor="grundlage_beitrag">{labelFor('grundlage_beitrag')}</Label>
        <Combobox
          id="grundlage_beitrag"
          placeholder=""
          items={fachbeitraegeListAll.map(r => ({
            id: r.record_id,
            label: displayNameOf('fachbeitraege', r.fields as Record<string, unknown>) || r.record_id,
          }))}
          value={extractRecordId(fields.grundlage_beitrag)}
          onChange={id => setFields(f => ({ ...f, grundlage_beitrag: id ? createRecordUrl(APP_IDS.FACHBEITRAEGE, id) : undefined }))}
          onCreateNew={(q) => openCreateFachbeitraege("grundlage_beitrag", q)}
          createLabel={t('create_in', { entity: appLabel('fachbeitraege') })}
        />
      </div>
    ),
    'geprueft_am': (
      <div key="geprueft_am" className="space-y-1.5">
        <Label htmlFor="geprueft_am">{labelFor('geprueft_am')}</Label>
        <DatePicker
          id="geprueft_am"
          placeholder=""
          mode="date"
          value={fields.geprueft_am ?? null}
          onChange={v => setFields(f => ({ ...f, geprueft_am: v ?? undefined }))}
        />
      </div>
    ),
  };
  // Fields this dialog never shows: the config's `hidden` and the fields the
  // OVERVIEW changes with its own button (plan.dashboard.writes, how: button —
  // a control, not a form value; S-3). A required field stays visible.
  const DASHBOARD_BUTTON_FIELDS: string[] = [];
  const ALWAYS_SHOWN: string[] = ['vorhaben', 'abhaengige_aufgabe', 'grundlage_art', 'pruefung_status'];
  // the values the plan's create flow sets itself (fixed:…): preset on create and
  // not asked — the dialog is the record's door, the flow's rule still holds (S-12)
  const HIDDEN = new Set<string>([...(formEnhancements.hidden ?? []), ...DASHBOARD_BUTTON_FIELDS, ...(recordId ? [] : Object.keys(PLAN_CREATE_PRESETS))].filter(k => !ALWAYS_SHOWN.includes(k)));
  const orderedFields = dropHidden(applyFieldOrder(Object.keys(fieldBlocks), formEnhancements.fieldOrder), HIDDEN);
  const orderedFieldsKey = orderedFields.map((it) => typeof it === 'string' ? it : it.row.join('+')).join(',');

  // Render-Modell für Computed-Felder:
  //
  //   • BACKEND-FELDER mit computed-Eintrag (z.B. gesamtpreis bei einer
  //     Katzenpension) bleiben als normales Eingabe-Feld stehen. Der Number-
  //     Input nutzt den computed-Wert als Vorschlag, der User kann jederzeit
  //     überschreiben (clearing → restore computed).
  //   • VIRTUELLE computed-Keys (Eintrag in formEnhancements.computed, ABER
  //     kein passendes Backend-Feld in orderedFields) erscheinen NICHT als
  //     Input, sondern unten als kompakte 'Berechnungen'-Übersicht oder als
  //     Inline-Hint unter dem letzten beitragenden Input.
  const FIELD_LABELS: Record<string, string> = {"vorhaben": "Angebotsvorhaben", "abhaengige_aufgabe": "Abhängige Aufgabe", "grundlage_art": "Grundlage ist", "grundlage_variante": "Variante als Grundlage", "grundlage_aufgabe": "Aufgabe als Grundlage", "aenderung": "Änderung an der Grundlage", "pruefung_noetig": "Erneute Prüfung erforderlich", "pruefung_status": "Stand der Prüfung", "grundlage_anforderung": "Anforderung als Grundlage", "grundlage_beitrag": "Fachbeitrag als Grundlage", "geprueft_am": "Geprüft am"};
  const CURRENCY_KEYS = new Set<string>([]);
  // Applookup-Referenz-Labels: pro applookup-Feld in dieser Form (ownKey)
  // eine Map { lookupKey: label } für ALLE Felder des Target-Schemas. Wird
  // beim Render-Walk gefiltert auf die in der computed-Formel tatsächlich
  // referenzierten lookupKeys (siehe applookupRefs unten).
  const APPLOOKUP_LABELS: Record<string, Record<string, string>> = {"vorhaben": {"bezeichnung": "Vorhabenbezeichnung", "kundenname": "Kunde", "anfragenummer": "Anfragenummer", "eingangsdatum": "Eingangsdatum", "abgabefrist": "Abgabefrist", "anfragebeschreibung": "Kurzbeschreibung der Anfrage", "liefergegenstand": "Liefergegenstand", "phase": "Phase", "prioritaet": "Priorität", "auftragsvolumen": "Geschätztes Auftragsvolumen in Euro", "projektleitung": "Projektleitung", "besonderheiten": "Besonderheiten"}, "abhaengige_aufgabe": {"titel": "Titel", "vorhaben": "Angebotsvorhaben", "art": "Art der Untersuchung", "verantwortlicher": "Verantwortlicher", "faelligkeit": "Fälligkeit", "status": "Status", "ausloeser": "Auslöser", "fragestellung": "Fragestellung", "ergebnis": "Antwort oder Ergebnis", "folgeaufgabe_noetig": "Folgeaufgabe erforderlich", "folgeaufgabe_hinweis": "Hinweis zur Folgeaufgabe", "ausloesende_aufgabe": "Auslösende Aufgabe"}, "grundlage_variante": {"angebotspreis": "Angebotspreis in Euro", "akzeptierte_risiken": "Akzeptierte Risiken", "vorgaengerversion": "Vorgängerversion", "version": "Version", "vertragsbedingungen": "Vertragsbedingungen", "status": "Status", "herstellkosten": "Herstellkosten in Euro", "beschaffungskosten": "Beschaffungskosten in Euro", "aufwand_stunden": "Aufwand in Stunden", "vorhaben": "Angebotsvorhaben", "variantenbezeichnung": "Variantenbezeichnung", "beschreibung": "Beschreibung", "menge": "Menge", "teillieferung": "Teillieferung", "liefertermin": "Liefertermin"}, "grundlage_aufgabe": {"titel": "Titel", "vorhaben": "Angebotsvorhaben", "art": "Art der Untersuchung", "verantwortlicher": "Verantwortlicher", "faelligkeit": "Fälligkeit", "status": "Status", "ausloeser": "Auslöser", "fragestellung": "Fragestellung", "ergebnis": "Antwort oder Ergebnis", "folgeaufgabe_noetig": "Folgeaufgabe erforderlich", "folgeaufgabe_hinweis": "Hinweis zur Folgeaufgabe", "ausloesende_aufgabe": "Auslösende Aufgabe"}, "grundlage_anforderung": {"vorhaben": "Angebotsvorhaben", "titel": "Titel", "beschreibung": "Beschreibung", "quellenart": "Art der Quelle", "quellenangabe": "Quellenangabe", "version": "Version", "status": "Status", "gueltig_ab": "Gültig ab", "vorgaengerversion": "Vorgängerversion"}, "grundlage_beitrag": {"vorhaben": "Angebotsvorhaben", "aufgabe": "Zugehörige Aufgabe", "autor": "Autor", "anforderung": "Bezogene Anforderung", "variante": "Bezogene Angebotsvariante", "inhalt": "Inhalt des Beitrags", "bedingungen": "Bedingungen", "gueltig_von": "Gültig von", "gueltig_bis": "Gültig bis", "status": "Status"}};
  const inputFields = useMemo(() => flattenFieldOrder(orderedFields), [orderedFieldsKey]);
  const backendFieldSet = useMemo(() => new Set(inputFields), [inputFields.join(',')]);
  const virtualComputed = useMemo(
    () => Object.fromEntries(
      Object.entries(formEnhancements.computed).filter(([k]) => !backendFieldSet.has(k)),
    ),
    [backendFieldSet],
  );
  const virtualFormEnhancements = useMemo(
    () => ({ ...formEnhancements, computed: virtualComputed }),
    [virtualComputed],
  );
  const computedLayout = useMemo(
    () => classifyComputed(virtualFormEnhancements, inputFields, computedDeps),
    [virtualFormEnhancements, inputFields.join(',')],
  );
  // Applookup-Referenzen: pro ownKey (Lookup-Feld im Form) die Liste der
  // lookupKeys, die in irgendeiner computed-Formel referenziert werden.
  // MODUS-1: aus dem Spec-Tree extrahiert. MODUS-2: aus dem Build-Time-
  // Export computedApplookupRefs (parse-formulas hat Regex-Pairs gesammelt).
  // Pro (ownKey, lookupKey)-Paar nur einmal; pro ownKey können aber mehrere
  // lookupKeys gleichzeitig auftauchen (z.B. einzelpreis UND karten10_preis
  // beim Yoga-Kurs), und alle werden separat als Inline-Hint gerendert.
  const applookupRefs = useMemo(
    () => mergeApplookupRefs(
      extractApplookupRefs(formEnhancements.computed),
      computedApplookupRefs,
    ),
    [],
  );
  function summaryLabel(k: string): string {
    if (FIELD_LABELS[k]) return FIELD_LABELS[k];
    // Leading underscore(s) als Virtual-Marker abstreifen; Unterstriche zu
    // Leerzeichen, jedes Wort kapitalisieren. Umlaute kommen vom Sub-Agent
    // direkt im Key (z. B. `_buchung_dauer_nächte`) — JS/TS/Vite unterstützen
    // Unicode-Identifier nativ, daher keine ASCII-Transliteration nötig.
    return k.replace(/^_+/, '')
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  function formatSummaryValue(k: string, v: unknown): string {
    if (v === undefined || v === null || v === '' || (typeof v === 'number' && !Number.isFinite(v))) return '—';
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return String(v);
    // Backend-Feld mit €-Label ODER virtueller Computed-Key, dessen Name nach Geld aussieht.
    const looksLikeCurrency = CURRENCY_KEYS.has(k) || /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k);
    if (looksLikeCurrency) {
      return n.toLocaleString(localeTag(), { style: 'currency', currency: CURRENCY, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return n.toLocaleString(localeTag(), { maximumFractionDigits: 2 });
  }

  return (
    <>
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] flex flex-col overflow-hidden p-0 gap-0 max-sm:[&>button]:size-10 max-sm:[&>button]:grid max-sm:[&>button]:place-items-center max-sm:[&>button]:rounded-full max-sm:[&>button]:border max-sm:[&>button]:border-input max-sm:[&>button]:bg-background max-sm:[&>button]:opacity-100 max-sm:[&>button>svg]:size-5">
        <DialogHeader className="px-6 pt-5 pb-3 border-b flex flex-row items-center gap-3 space-y-0">
          <DialogTitle className="flex-1 truncate text-left">{DIALOG_INTENT}</DialogTitle>
          {enablePhotoScan && (
            <button
              type="button"
              onClick={() => setAiOpen(o => !o)}
              aria-expanded={aiOpen}
              aria-controls="ai-fill-panel"
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 max-sm:py-2.5 max-sm:px-4 text-xs font-semibold transition-all mr-7 max-sm:mr-12 shadow-sm ${
                aiOpen
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                  : 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/15 hover:border-primary/50'
              }`}
            >
              <IconSparkles className={`h-3.5 w-3.5 ${aiOpen ? '' : 'text-primary'}`} />
              <span className="hidden sm:inline">{t('smart_fill')}</span>
              <IconChevronDown className={`h-3 w-3 transition-transform ${aiOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </DialogHeader>
        {enablePhotoScan && aiOpen && (
          <div id="ai-fill-panel" className="border-b bg-muted/20 px-6 py-4 space-y-3">
            <p className="text-xs text-muted-foreground">{t('scan_header_sub')}</p>
            <div className="flex items-start gap-2 pl-0.5">
              <Checkbox
                id="ai-use-personal-info"
                checked={usePersonalInfo}
                onCheckedChange={(v) => setUsePersonalInfo(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-snug">
                <Label htmlFor="ai-use-personal-info" className="text-xs font-normal text-muted-foreground cursor-pointer inline">
                  {t('useinfo_label')}
                </Label>
                {' '}
                <button type="button" onClick={handleShowProfileInfo} className="text-xs text-primary hover:underline whitespace-nowrap">
                  {profileLoading ? t('useinfo_loading') : `(${t('useinfo_more')})`}
                </button>
              </span>
            </div>
            {showProfileInfo && (
              <div className="rounded-md border bg-muted/50 p-2 text-xs max-h-40 overflow-y-auto">
                <p className="font-medium mb-1">{t('profile_preamble')}</p>
                {profileData ? Object.values(profileData).map((v, i) => (
                  <span key={i}>{i > 0 && ", "}{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                )) : (
                  <span className="text-muted-foreground">{t('useinfo_error')}</span>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconLoader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{t('scan_analyzing')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('scan_analyzing_sub')}</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <IconCircleCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">{t('scan_success')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('scan_success_sub')}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <IconPhotoPlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{t('scan_upload')}</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center"
                    >
                      <IconX className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1" />{t('scan_camera_btn')}
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1" />{t('scan_file_btn')}
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <IconFileText className="h-3.5 w-3.5 mr-1" />{t('scan_doc_btn')}
              </Button>
            </div>

            <div className="relative">
              <Textarea
                placeholder={t('scan_text_placeholder')}
                value={aiText}
                onChange={e => {
                  setAiText(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = Math.min(Math.max(el.scrollHeight, 56), 96) + 'px';
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && aiText.trim() && !scanning) {
                    e.preventDefault();
                    handleAiExtract();
                  }
                }}
                disabled={scanning}
                rows={2}
                className="pr-12 resize-none text-sm overflow-y-auto"
              />
              <button
                type="button"
                className="absolute right-2 top-2 h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                disabled={scanning}
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setAiText(prev => prev ? prev + '\n' + text : text);
                  } catch {}
                }}
                title={t('paste')}
              >
                <IconClipboard className="h-4 w-4" />
              </button>
            </div>
            {aiText.trim() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs"
                disabled={scanning}
                onClick={() => handleAiExtract()}
              >
                <IconSparkles className="h-3.5 w-3.5 mr-1.5" />{t('scan_text_analyze')}
              </Button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0 min-w-0 max-sm:[&_input]:h-11">
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-4 min-w-0">
            {(() => {
              const renderField = (k: string) => {
                const inlineHints = computedLayout.anchors[k] ?? [];
                const refs = applookupRefs[k] ?? [];
                // A field the plan gives to a TOOL. On CREATE it is not shown
                // at all — the value does not exist yet and typing one only
                // gets overwritten. On EDIT it stays a normal input with a
                // note: when a tool could not compose its value (a missing
                // ingredient), this is the only place to repair the record.
                if (SYSTEM_ASSIGNED.includes(k) && !recordId) {
                  return (
                    <div key={k} className="space-y-1.5 min-w-0">
                      <Label>{labelFor(k)}</Label>
                      <p className="text-sm text-muted-foreground">{t('assigned_by_system')}</p>
                    </div>
                  );
                }
                return (
                  <div key={k} className="space-y-1.5 min-w-0">
                    {fieldBlocks[k]}
                    {SYSTEM_ASSIGNED.includes(k) && (
                      <p className="text-xs text-muted-foreground">{t('assigned_by_system')}</p>
                    )}
                    {refs.map(({ lookupKey }) => {
                      // Show the live numeric value the formula will pull from
                      // the selected lookup target (e.g. "Monatspreis: 34,90 €"
                      // under the Tarif combobox). Hidden while no lookup is
                      // selected or the target field is non-numeric.
                      const v = resolveApplookupRef(k, lookupKey, fields as Record<string, unknown>, computedContext);
                      if (v === null) return null;
                      const lbl = APPLOOKUP_LABELS[k]?.[lookupKey] ?? lookupKey;
                      const text = formatSummaryValue(lookupKey, v);
                      return (
                        <div key={`alh-${k}-${lookupKey}`} className="flex items-center gap-1.5 pl-3 text-xs text-muted-foreground">
                          <span className="text-primary/70">→</span>
                          <span>{lbl}</span>
                          <span className="ml-auto font-medium tabular-nums text-foreground">{text}</span>
                        </div>
                      );
                    })}
                    {inlineHints.map((cKey) => {
                      const v = computedValues[cKey];
                      const text = formatSummaryValue(cKey, v);
                      if (text === '—') return null;
                      return (
                        <div key={cKey} className="flex items-center gap-1.5 pl-3 text-xs text-muted-foreground">
                          <span className="text-primary/70">→</span>
                          <span>{summaryLabel(cKey)}</span>
                          <span className="ml-auto font-medium tabular-nums text-foreground">{text}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              };
              return orderedFields.map((item, idx) => {
                if (typeof item === 'string') return renderField(item);
                const cols = item.cols ?? `repeat(${item.row.length}, minmax(0, 1fr))`;
                return (
                  <div key={`row-${idx}`} className="grid gap-3" style={{ gridTemplateColumns: cols }}>
                    {item.row.map(renderField)}
                  </div>
                );
              });
            })()}
            {(computedLayout.aggregates.length > 0 || computedLayout.finalTotal) && (
              <div className="mt-6 pt-4 border-t border-border space-y-1.5">
                {computedLayout.aggregates.length > 0 && (
                  <dl className="space-y-1.5 pb-2">
                    {computedLayout.aggregates.map((k) => {
                      const userVal = (fields as Record<string, unknown>)[k];
                      const computed = computedValues[k];
                      const v = userVal !== undefined && userVal !== null && userVal !== '' ? userVal : computed;
                      return (
                        <div key={k} className="flex justify-between items-baseline gap-3">
                          <dt className="text-sm text-muted-foreground truncate">{summaryLabel(k)}</dt>
                          <dd className="text-sm font-medium tabular-nums whitespace-nowrap">{formatSummaryValue(k, v)}</dd>
                        </div>
                      );
                    })}
                  </dl>
                )}
                {computedLayout.finalTotal && (() => {
                  const k = computedLayout.finalTotal;
                  const userVal = (fields as Record<string, unknown>)[k];
                  const computed = computedValues[k];
                  const v = userVal !== undefined && userVal !== null && userVal !== '' ? userVal : computed;
                  // Innere Border nur wenn aggregates existieren — sonst hätten wir
                  // zwei direkt aufeinanderfolgende Striche (Outer + Inner) mit nur
                  // einer Aggregat-Zeile dazwischen → zu viel visuelles Rauschen.
                  const sep = computedLayout.aggregates.length > 0 ? 'pt-3 border-t border-border' : 'pt-1';
                  return (
                    <div className={`flex justify-between items-baseline gap-3 ${sep}`}>
                      <span className="text-base font-semibold text-foreground">{summaryLabel(k)}</span>
                      <span className="text-lg font-bold tabular-nums whitespace-nowrap text-foreground">{formatSummaryValue(k, v)}</span>
                    </div>
                  );
                })()}
              </div>
            )}
            {showErrors && missingRequired.length > 0 && (
              <p className="text-xs text-destructive flex items-center gap-1.5" role="alert">
                <IconAlertCircle className="h-3.5 w-3.5 shrink-0" />
                {t('missing_required')}
              </p>
            )}
            {recordId && (
              <div className="pt-2 border-t border-border">
                <AttachmentsSection appId={APP_IDS.ABHAENGIGKEITEN} recordId={recordId} />
              </div>
            )}
          </div>
          {submitError && (
            <div className="flex items-start gap-2 border-t border-destructive/20 bg-destructive/10 px-6 py-2.5 text-sm text-destructive" role="alert">
              <IconAlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="min-w-0 break-words">{submitError}</span>
            </div>
          )}
          <DialogFooter className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-6 py-3 gap-2 max-sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose} className="max-sm:h-12 max-sm:flex-1 max-sm:text-base">{t('cancel')}</Button>
            <Button
              type="submit"
              className="max-sm:h-12 max-sm:flex-1 max-sm:text-base"
              disabled={saving || !isDirty || (showErrors && missingRequired.length > 0)}
            >
              {saving ? t('saving') : defaultValues ? t('save') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {createAngebotsvorhabenOpen && (
      <AngebotsvorhabenDialog
        open={createAngebotsvorhabenOpen}
        onClose={() => setCreateAngebotsvorhabenOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createAngebotsvorhabenEntry(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as Angebotsvorhaben;
            setExtraAngebotsvorhaben(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.ANGEBOTSVORHABEN, result.id);
            setFields(prev => ({ ...prev, [createAngebotsvorhabenField]: url } as any));
          }
          setCreateAngebotsvorhabenOpen(false);
        }}
        defaultValues={createAngebotsvorhabenInitial
          ? ({ bezeichnung: createAngebotsvorhabenInitial } as any)
          : undefined}
        beteiligteList={[]}
      />
    )}
    {createAufgabenOpen && (
      <AufgabenDialog
        open={createAufgabenOpen}
        onClose={() => setCreateAufgabenOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createAufgabenEntry(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as Aufgaben;
            setExtraAufgaben(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.AUFGABEN, result.id);
            setFields(prev => ({ ...prev, [createAufgabenField]: url } as any));
          }
          setCreateAufgabenOpen(false);
        }}
        defaultValues={createAufgabenInitial
          ? ({ titel: createAufgabenInitial } as any)
          : undefined}
        angebotsvorhabenList={angebotsvorhabenList}
        beteiligteList={[]}
        aufgabenList={aufgabenList}
      />
    )}
    {createAngebotsvariantenOpen && (
      <AngebotsvariantenDialog
        open={createAngebotsvariantenOpen}
        onClose={() => setCreateAngebotsvariantenOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createAngebotsvariantenEntry(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as Angebotsvarianten;
            setExtraAngebotsvarianten(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.ANGEBOTSVARIANTEN, result.id);
            setFields(prev => ({ ...prev, [createAngebotsvariantenField]: url } as any));
          }
          setCreateAngebotsvariantenOpen(false);
        }}
        defaultValues={createAngebotsvariantenInitial
          ? ({ variantenbezeichnung: createAngebotsvariantenInitial } as any)
          : undefined}
        angebotsvariantenList={angebotsvariantenList}
        angebotsvorhabenList={angebotsvorhabenList}
      />
    )}
    {createAnforderungenOpen && (
      <AnforderungenDialog
        open={createAnforderungenOpen}
        onClose={() => setCreateAnforderungenOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createAnforderungenEntry(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as Anforderungen;
            setExtraAnforderungen(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.ANFORDERUNGEN, result.id);
            setFields(prev => ({ ...prev, [createAnforderungenField]: url } as any));
          }
          setCreateAnforderungenOpen(false);
        }}
        defaultValues={createAnforderungenInitial
          ? ({ titel: createAnforderungenInitial } as any)
          : undefined}
        angebotsvorhabenList={angebotsvorhabenList}
        anforderungenList={anforderungenList}
      />
    )}
    {createFachbeitraegeOpen && (
      <FachbeitraegeDialog
        open={createFachbeitraegeOpen}
        onClose={() => setCreateFachbeitraegeOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createFachbeitraegeEntry(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as Fachbeitraege;
            setExtraFachbeitraege(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.FACHBEITRAEGE, result.id);
            setFields(prev => ({ ...prev, [createFachbeitraegeField]: url } as any));
          }
          setCreateFachbeitraegeOpen(false);
        }}
        defaultValues={createFachbeitraegeInitial
          ? ({ inhalt: createFachbeitraegeInitial } as any)
          : undefined}
        angebotsvorhabenList={angebotsvorhabenList}
        aufgabenList={aufgabenList}
        beteiligteList={[]}
        anforderungenList={anforderungenList}
        angebotsvariantenList={angebotsvariantenList}
      />
    )}
    </>
  );
}