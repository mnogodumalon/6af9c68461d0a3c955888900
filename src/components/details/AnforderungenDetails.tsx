import type { Anforderungen, Angebotsvorhaben, Fachbeitraege, Abhaengigkeiten, Angebotsuebernahmen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';
import { displayNameOf, displayPart } from '@/lib/journey/rules';

export interface AnforderungenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Anforderungen;
  /** N:1-Ziel „Angebotsvorhaben": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  angebotsvorhabenList: Angebotsvorhaben[];
  /** Klick auf die Angebotsvorhaben-Relation → overlay.push auf dessen Detail. */
  onOpenAngebotsvorhaben?: (record: Angebotsvorhaben) => void;
  /** N:1-Ziel „Anforderungen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  anforderungenList: Anforderungen[];
  /** Klick auf die Anforderungen-Relation → overlay.push auf dessen Detail. */
  onOpenAnforderungen?: (record: Anforderungen) => void;
  /** 1:N „Fachbeiträge" (anforderung): VOLLE Liste — der Block filtert auf diesen Record. */
  fachbeitraegeList: Fachbeitraege[];
  /** Zeilen-Klick → overlay.push auf das Fachbeitraege-Detail (nie der Edit-Dialog). */
  onOpenFachbeitraege: (record: Fachbeitraege) => void;
  /** Kontextuelles „+": öffnet den Fachbeitraege-Dialog mit diesem Record vorgesetzt. */
  onAddFachbeitraege?: () => void;
  /** 1:N „Abhängigkeiten" (grundlage_anforderung): VOLLE Liste — der Block filtert auf diesen Record. */
  abhaengigkeitenList: Abhaengigkeiten[];
  /** Zeilen-Klick → overlay.push auf das Abhaengigkeiten-Detail (nie der Edit-Dialog). */
  onOpenAbhaengigkeiten: (record: Abhaengigkeiten) => void;
  /** Kontextuelles „+": öffnet den Abhaengigkeiten-Dialog mit diesem Record vorgesetzt. */
  onAddAbhaengigkeiten?: () => void;
  /** 1:N „Angebotsübernahmen" (anforderung): VOLLE Liste — der Block filtert auf diesen Record. */
  angebotsuebernahmenList: Angebotsuebernahmen[];
  /** Zeilen-Klick → overlay.push auf das Angebotsuebernahmen-Detail (nie der Edit-Dialog). */
  onOpenAngebotsuebernahmen: (record: Angebotsuebernahmen) => void;
  /** Kontextuelles „+": öffnet den Angebotsuebernahmen-Dialog mit diesem Record vorgesetzt. */
  onAddAngebotsuebernahmen?: () => void;
}

export function AnforderungenDetails({
  record,
  angebotsvorhabenList,
  onOpenAngebotsvorhaben,
  anforderungenList,
  onOpenAnforderungen,
  fachbeitraegeList,
  onOpenFachbeitraege,
  onAddFachbeitraege,
  abhaengigkeitenList,
  onOpenAbhaengigkeiten,
  onAddAbhaengigkeiten,
  angebotsuebernahmenList,
  onOpenAngebotsuebernahmen,
  onAddAngebotsuebernahmen,
}: AnforderungenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const vorhabenTarget = angebotsvorhabenList.find(r => r.record_id === extractRecordId(record.fields.vorhaben));
  const vorgaengerversionTarget = anforderungenList.find(r => r.record_id === extractRecordId(record.fields.vorgaengerversion));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('anforderungen', 'titel')} value={record.fields.titel} format="text" />
        <RecordField label={fieldLabel('anforderungen', 'beschreibung')} value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('anforderungen', 'quellenart')} value={record.fields.quellenart} format="pill" />
        <RecordField label={fieldLabel('anforderungen', 'quellenangabe')} value={record.fields.quellenangabe} format="text" />
        <RecordField label={fieldLabel('anforderungen', 'version')} value={record.fields.version} format="text" />
        <RecordField label={fieldLabel('anforderungen', 'status')} value={record.fields.status} format="pill" />
        <RecordField label={fieldLabel('anforderungen', 'gueltig_ab')} value={record.fields.gueltig_ab} format="date" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('anforderungen', 'vorhaben')}
          name={vorhabenTarget ? (displayNameOf('angebotsvorhaben', vorhabenTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={[vorhabenTarget?.fields.kundenname, vorhabenTarget?.fields.anfragenummer].filter(Boolean).join(' · ') || undefined}
          onClick={vorhabenTarget && onOpenAngebotsvorhaben ? () => onOpenAngebotsvorhaben!(vorhabenTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('anforderungen', 'vorgaengerversion')}
          name={vorgaengerversionTarget ? (displayNameOf('anforderungen', vorgaengerversionTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={[vorgaengerversionTarget?.fields.quellenangabe].filter(Boolean).join(' · ') || undefined}
          onClick={vorgaengerversionTarget && onOpenAnforderungen ? () => onOpenAnforderungen!(vorgaengerversionTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('fachbeitraege')}
        items={fachbeitraegeList.filter(r => extractRecordId(r.fields.anforderung) === record.record_id)}
        map={r => ({ name: displayNameOf('fachbeitraege', r.fields as Record<string, unknown>) || appLabel('fachbeitraege'), meta: displayPart(r.fields.gueltig_von) })}
        onOpen={onOpenFachbeitraege}
        onAdd={onAddFachbeitraege}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('abhaengigkeiten')}
        items={abhaengigkeitenList.filter(r => extractRecordId(r.fields.grundlage_anforderung) === record.record_id)}
        map={r => ({ name: displayNameOf('abhaengigkeiten', r.fields as Record<string, unknown>) || appLabel('abhaengigkeiten'), meta: displayPart(r.fields.geprueft_am) })}
        onOpen={onOpenAbhaengigkeiten}
        onAdd={onAddAbhaengigkeiten}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('angebotsuebernahmen')}
        items={angebotsuebernahmenList.filter(r => extractRecordId(r.fields.anforderung) === record.record_id)}
        map={r => ({ name: displayNameOf('angebotsuebernahmen', r.fields as Record<string, unknown>) || appLabel('angebotsuebernahmen'), meta: displayPart(r.fields.uebernahmedatum) })}
        onOpen={onOpenAngebotsuebernahmen}
        onAdd={onAddAngebotsuebernahmen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.ANFORDERUNGEN} recordId={record.record_id} readOnly={!perms.canWrite('anforderungen')} />
    </>
  );
}
