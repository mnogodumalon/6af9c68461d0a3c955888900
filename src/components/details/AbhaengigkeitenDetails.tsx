import type { Abhaengigkeiten, Angebotsvorhaben, Aufgaben, Angebotsvarianten, Anforderungen, Fachbeitraege } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { usePermissions } from '@/lib/permissions';
import { displayNameOf } from '@/lib/journey/rules';

export interface AbhaengigkeitenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Abhaengigkeiten;
  /** N:1-Ziel „Angebotsvorhaben": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  angebotsvorhabenList: Angebotsvorhaben[];
  /** Klick auf die Angebotsvorhaben-Relation → overlay.push auf dessen Detail. */
  onOpenAngebotsvorhaben?: (record: Angebotsvorhaben) => void;
  /** N:1-Ziel „Aufgaben": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  aufgabenList: Aufgaben[];
  /** Klick auf die Aufgaben-Relation → overlay.push auf dessen Detail. */
  onOpenAufgaben?: (record: Aufgaben) => void;
  /** N:1-Ziel „Angebotsvarianten": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  angebotsvariantenList: Angebotsvarianten[];
  /** Klick auf die Angebotsvarianten-Relation → overlay.push auf dessen Detail. */
  onOpenAngebotsvarianten?: (record: Angebotsvarianten) => void;
  /** N:1-Ziel „Anforderungen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  anforderungenList: Anforderungen[];
  /** Klick auf die Anforderungen-Relation → overlay.push auf dessen Detail. */
  onOpenAnforderungen?: (record: Anforderungen) => void;
  /** N:1-Ziel „Fachbeitraege": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  fachbeitraegeList: Fachbeitraege[];
  /** Klick auf die Fachbeitraege-Relation → overlay.push auf dessen Detail. */
  onOpenFachbeitraege?: (record: Fachbeitraege) => void;
}

export function AbhaengigkeitenDetails({
  record,
  angebotsvorhabenList,
  onOpenAngebotsvorhaben,
  aufgabenList,
  onOpenAufgaben,
  angebotsvariantenList,
  onOpenAngebotsvarianten,
  anforderungenList,
  onOpenAnforderungen,
  fachbeitraegeList,
  onOpenFachbeitraege,
}: AbhaengigkeitenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const vorhabenTarget = angebotsvorhabenList.find(r => r.record_id === extractRecordId(record.fields.vorhaben));
  const abhaengige_aufgabeTarget = aufgabenList.find(r => r.record_id === extractRecordId(record.fields.abhaengige_aufgabe));
  const grundlage_varianteTarget = angebotsvariantenList.find(r => r.record_id === extractRecordId(record.fields.grundlage_variante));
  const grundlage_aufgabeTarget = aufgabenList.find(r => r.record_id === extractRecordId(record.fields.grundlage_aufgabe));
  const grundlage_anforderungTarget = anforderungenList.find(r => r.record_id === extractRecordId(record.fields.grundlage_anforderung));
  const grundlage_beitragTarget = fachbeitraegeList.find(r => r.record_id === extractRecordId(record.fields.grundlage_beitrag));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('abhaengigkeiten', 'grundlage_art')} value={record.fields.grundlage_art} format="pill" />
        <RecordField label={fieldLabel('abhaengigkeiten', 'aenderung')} value={record.fields.aenderung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('abhaengigkeiten', 'pruefung_noetig')} value={record.fields.pruefung_noetig} format="bool" />
        <RecordField label={fieldLabel('abhaengigkeiten', 'pruefung_status')} value={record.fields.pruefung_status} format="pill" />
        <RecordField label={fieldLabel('abhaengigkeiten', 'geprueft_am')} value={record.fields.geprueft_am} format="date" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('abhaengigkeiten', 'vorhaben')}
          name={vorhabenTarget ? (displayNameOf('angebotsvorhaben', vorhabenTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={[vorhabenTarget?.fields.kundenname, vorhabenTarget?.fields.anfragenummer].filter(Boolean).join(' · ') || undefined}
          onClick={vorhabenTarget && onOpenAngebotsvorhaben ? () => onOpenAngebotsvorhaben!(vorhabenTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('abhaengigkeiten', 'abhaengige_aufgabe')}
          name={abhaengige_aufgabeTarget ? (displayNameOf('aufgaben', abhaengige_aufgabeTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={undefined}
          onClick={abhaengige_aufgabeTarget && onOpenAufgaben ? () => onOpenAufgaben!(abhaengige_aufgabeTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('abhaengigkeiten', 'grundlage_variante')}
          name={grundlage_varianteTarget ? (displayNameOf('angebotsvarianten', grundlage_varianteTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={undefined}
          onClick={grundlage_varianteTarget && onOpenAngebotsvarianten ? () => onOpenAngebotsvarianten!(grundlage_varianteTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('abhaengigkeiten', 'grundlage_aufgabe')}
          name={grundlage_aufgabeTarget ? (displayNameOf('aufgaben', grundlage_aufgabeTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={undefined}
          onClick={grundlage_aufgabeTarget && onOpenAufgaben ? () => onOpenAufgaben!(grundlage_aufgabeTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('abhaengigkeiten', 'grundlage_anforderung')}
          name={grundlage_anforderungTarget ? (displayNameOf('anforderungen', grundlage_anforderungTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={[grundlage_anforderungTarget?.fields.quellenangabe].filter(Boolean).join(' · ') || undefined}
          onClick={grundlage_anforderungTarget && onOpenAnforderungen ? () => onOpenAnforderungen!(grundlage_anforderungTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('abhaengigkeiten', 'grundlage_beitrag')}
          name={grundlage_beitragTarget ? (displayNameOf('fachbeitraege', grundlage_beitragTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={undefined}
          onClick={grundlage_beitragTarget && onOpenFachbeitraege ? () => onOpenFachbeitraege!(grundlage_beitragTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.ABHAENGIGKEITEN} recordId={record.record_id} readOnly={!perms.canWrite('abhaengigkeiten')} />
    </>
  );
}
