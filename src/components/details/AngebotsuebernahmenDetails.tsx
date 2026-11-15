import type { Angebotsuebernahmen, Anforderungen, Fachbeitraege, Angebotsvorhaben, Angebotsvarianten, Entscheidungen, Beteiligte } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { usePermissions } from '@/lib/permissions';
import { displayNameOf } from '@/lib/journey/rules';

export interface AngebotsuebernahmenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Angebotsuebernahmen;
  /** N:1-Ziel „Anforderungen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  anforderungenList: Anforderungen[];
  /** Klick auf die Anforderungen-Relation → overlay.push auf dessen Detail. */
  onOpenAnforderungen?: (record: Anforderungen) => void;
  /** N:1-Ziel „Fachbeitraege": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  fachbeitraegeList: Fachbeitraege[];
  /** Klick auf die Fachbeitraege-Relation → overlay.push auf dessen Detail. */
  onOpenFachbeitraege?: (record: Fachbeitraege) => void;
  /** N:1-Ziel „Angebotsvorhaben": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  angebotsvorhabenList: Angebotsvorhaben[];
  /** Klick auf die Angebotsvorhaben-Relation → overlay.push auf dessen Detail. */
  onOpenAngebotsvorhaben?: (record: Angebotsvorhaben) => void;
  /** N:1-Ziel „Angebotsvarianten": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  angebotsvariantenList: Angebotsvarianten[];
  /** Klick auf die Angebotsvarianten-Relation → overlay.push auf dessen Detail. */
  onOpenAngebotsvarianten?: (record: Angebotsvarianten) => void;
  /** N:1-Ziel „Entscheidungen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  entscheidungenList: Entscheidungen[];
  /** Klick auf die Entscheidungen-Relation → overlay.push auf dessen Detail. */
  onOpenEntscheidungen?: (record: Entscheidungen) => void;
  /** N:1-Ziel „Beteiligte": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  beteiligteList: Beteiligte[];
  /** Klick auf die Beteiligte-Relation → overlay.push auf dessen Detail. */
  onOpenBeteiligte?: (record: Beteiligte) => void;
}

export function AngebotsuebernahmenDetails({
  record,
  anforderungenList,
  onOpenAnforderungen,
  fachbeitraegeList,
  onOpenFachbeitraege,
  angebotsvorhabenList,
  onOpenAngebotsvorhaben,
  angebotsvariantenList,
  onOpenAngebotsvarianten,
  entscheidungenList,
  onOpenEntscheidungen,
  beteiligteList,
  onOpenBeteiligte,
}: AngebotsuebernahmenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const anforderungTarget = anforderungenList.find(r => r.record_id === extractRecordId(record.fields.anforderung));
  const beitragTarget = fachbeitraegeList.find(r => r.record_id === extractRecordId(record.fields.beitrag));
  const vorhabenTarget = angebotsvorhabenList.find(r => r.record_id === extractRecordId(record.fields.vorhaben));
  const varianteTarget = angebotsvariantenList.find(r => r.record_id === extractRecordId(record.fields.variante));
  const entscheidungTarget = entscheidungenList.find(r => r.record_id === extractRecordId(record.fields.entscheidung));
  const uebernommen_vonTarget = beteiligteList.find(r => r.record_id === extractRecordId(record.fields.uebernommen_von));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('angebotsuebernahmen', 'inhaltsart')} value={record.fields.inhaltsart} format="pill" />
        <RecordField label={fieldLabel('angebotsuebernahmen', 'angebotstext')} value={record.fields.angebotstext} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('angebotsuebernahmen', 'uebernahmedatum')} value={record.fields.uebernahmedatum} format="date" />
        <RecordField label={fieldLabel('angebotsuebernahmen', 'bemerkung')} value={record.fields.bemerkung} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('angebotsuebernahmen', 'anforderung')}
          name={anforderungTarget ? (displayNameOf('anforderungen', anforderungTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={[anforderungTarget?.fields.quellenangabe].filter(Boolean).join(' · ') || undefined}
          onClick={anforderungTarget && onOpenAnforderungen ? () => onOpenAnforderungen!(anforderungTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('angebotsuebernahmen', 'beitrag')}
          name={beitragTarget ? (displayNameOf('fachbeitraege', beitragTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={undefined}
          onClick={beitragTarget && onOpenFachbeitraege ? () => onOpenFachbeitraege!(beitragTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('angebotsuebernahmen', 'vorhaben')}
          name={vorhabenTarget ? (displayNameOf('angebotsvorhaben', vorhabenTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={[vorhabenTarget?.fields.kundenname, vorhabenTarget?.fields.anfragenummer].filter(Boolean).join(' · ') || undefined}
          onClick={vorhabenTarget && onOpenAngebotsvorhaben ? () => onOpenAngebotsvorhaben!(vorhabenTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('angebotsuebernahmen', 'variante')}
          name={varianteTarget ? (displayNameOf('angebotsvarianten', varianteTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={undefined}
          onClick={varianteTarget && onOpenAngebotsvarianten ? () => onOpenAngebotsvarianten!(varianteTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('angebotsuebernahmen', 'entscheidung')}
          name={entscheidungTarget ? (displayNameOf('entscheidungen', entscheidungTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={undefined}
          onClick={entscheidungTarget && onOpenEntscheidungen ? () => onOpenEntscheidungen!(entscheidungTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('angebotsuebernahmen', 'uebernommen_von')}
          name={uebernommen_vonTarget ? (displayNameOf('beteiligte', uebernommen_vonTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={[uebernommen_vonTarget?.fields.email, uebernommen_vonTarget?.fields.telefon].filter(Boolean).join(' · ') || undefined}
          onClick={uebernommen_vonTarget && onOpenBeteiligte ? () => onOpenBeteiligte!(uebernommen_vonTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.ANGEBOTSUEBERNAHMEN} recordId={record.record_id} readOnly={!perms.canWrite('angebotsuebernahmen')} />
    </>
  );
}
