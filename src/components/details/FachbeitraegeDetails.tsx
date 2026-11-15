import type { Fachbeitraege, Angebotsvorhaben, Aufgaben, Beteiligte, Anforderungen, Angebotsvarianten, Abhaengigkeiten, Angebotsuebernahmen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';
import { displayNameOf, displayPart } from '@/lib/journey/rules';

export interface FachbeitraegeDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Fachbeitraege;
  /** N:1-Ziel „Angebotsvorhaben": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  angebotsvorhabenList: Angebotsvorhaben[];
  /** Klick auf die Angebotsvorhaben-Relation → overlay.push auf dessen Detail. */
  onOpenAngebotsvorhaben?: (record: Angebotsvorhaben) => void;
  /** N:1-Ziel „Aufgaben": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  aufgabenList: Aufgaben[];
  /** Klick auf die Aufgaben-Relation → overlay.push auf dessen Detail. */
  onOpenAufgaben?: (record: Aufgaben) => void;
  /** N:1-Ziel „Beteiligte": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  beteiligteList: Beteiligte[];
  /** Klick auf die Beteiligte-Relation → overlay.push auf dessen Detail. */
  onOpenBeteiligte?: (record: Beteiligte) => void;
  /** N:1-Ziel „Anforderungen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  anforderungenList: Anforderungen[];
  /** Klick auf die Anforderungen-Relation → overlay.push auf dessen Detail. */
  onOpenAnforderungen?: (record: Anforderungen) => void;
  /** N:1-Ziel „Angebotsvarianten": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  angebotsvariantenList: Angebotsvarianten[];
  /** Klick auf die Angebotsvarianten-Relation → overlay.push auf dessen Detail. */
  onOpenAngebotsvarianten?: (record: Angebotsvarianten) => void;
  /** 1:N „Abhängigkeiten" (grundlage_beitrag): VOLLE Liste — der Block filtert auf diesen Record. */
  abhaengigkeitenList: Abhaengigkeiten[];
  /** Zeilen-Klick → overlay.push auf das Abhaengigkeiten-Detail (nie der Edit-Dialog). */
  onOpenAbhaengigkeiten: (record: Abhaengigkeiten) => void;
  /** Kontextuelles „+": öffnet den Abhaengigkeiten-Dialog mit diesem Record vorgesetzt. */
  onAddAbhaengigkeiten?: () => void;
  /** 1:N „Angebotsübernahmen" (beitrag): VOLLE Liste — der Block filtert auf diesen Record. */
  angebotsuebernahmenList: Angebotsuebernahmen[];
  /** Zeilen-Klick → overlay.push auf das Angebotsuebernahmen-Detail (nie der Edit-Dialog). */
  onOpenAngebotsuebernahmen: (record: Angebotsuebernahmen) => void;
  /** Kontextuelles „+": öffnet den Angebotsuebernahmen-Dialog mit diesem Record vorgesetzt. */
  onAddAngebotsuebernahmen?: () => void;
}

export function FachbeitraegeDetails({
  record,
  angebotsvorhabenList,
  onOpenAngebotsvorhaben,
  aufgabenList,
  onOpenAufgaben,
  beteiligteList,
  onOpenBeteiligte,
  anforderungenList,
  onOpenAnforderungen,
  angebotsvariantenList,
  onOpenAngebotsvarianten,
  abhaengigkeitenList,
  onOpenAbhaengigkeiten,
  onAddAbhaengigkeiten,
  angebotsuebernahmenList,
  onOpenAngebotsuebernahmen,
  onAddAngebotsuebernahmen,
}: FachbeitraegeDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const vorhabenTarget = angebotsvorhabenList.find(r => r.record_id === extractRecordId(record.fields.vorhaben));
  const aufgabeTarget = aufgabenList.find(r => r.record_id === extractRecordId(record.fields.aufgabe));
  const autorTarget = beteiligteList.find(r => r.record_id === extractRecordId(record.fields.autor));
  const anforderungTarget = anforderungenList.find(r => r.record_id === extractRecordId(record.fields.anforderung));
  const varianteTarget = angebotsvariantenList.find(r => r.record_id === extractRecordId(record.fields.variante));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('fachbeitraege', 'inhalt')} value={record.fields.inhalt} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('fachbeitraege', 'bedingungen')} value={record.fields.bedingungen} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('fachbeitraege', 'gueltig_von')} value={record.fields.gueltig_von} format="date" />
        <RecordField label={fieldLabel('fachbeitraege', 'gueltig_bis')} value={record.fields.gueltig_bis} format="date" />
        <RecordField label={fieldLabel('fachbeitraege', 'status')} value={record.fields.status} format="pill" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('fachbeitraege', 'vorhaben')}
          name={vorhabenTarget ? (displayNameOf('angebotsvorhaben', vorhabenTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={[vorhabenTarget?.fields.kundenname, vorhabenTarget?.fields.anfragenummer].filter(Boolean).join(' · ') || undefined}
          onClick={vorhabenTarget && onOpenAngebotsvorhaben ? () => onOpenAngebotsvorhaben!(vorhabenTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('fachbeitraege', 'aufgabe')}
          name={aufgabeTarget ? (displayNameOf('aufgaben', aufgabeTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={undefined}
          onClick={aufgabeTarget && onOpenAufgaben ? () => onOpenAufgaben!(aufgabeTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('fachbeitraege', 'autor')}
          name={autorTarget ? (displayNameOf('beteiligte', autorTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={[autorTarget?.fields.email, autorTarget?.fields.telefon].filter(Boolean).join(' · ') || undefined}
          onClick={autorTarget && onOpenBeteiligte ? () => onOpenBeteiligte!(autorTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('fachbeitraege', 'anforderung')}
          name={anforderungTarget ? (displayNameOf('anforderungen', anforderungTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={[anforderungTarget?.fields.quellenangabe].filter(Boolean).join(' · ') || undefined}
          onClick={anforderungTarget && onOpenAnforderungen ? () => onOpenAnforderungen!(anforderungTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('fachbeitraege', 'variante')}
          name={varianteTarget ? (displayNameOf('angebotsvarianten', varianteTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={undefined}
          onClick={varianteTarget && onOpenAngebotsvarianten ? () => onOpenAngebotsvarianten!(varianteTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('abhaengigkeiten')}
        items={abhaengigkeitenList.filter(r => extractRecordId(r.fields.grundlage_beitrag) === record.record_id)}
        map={r => ({ name: displayNameOf('abhaengigkeiten', r.fields as Record<string, unknown>) || appLabel('abhaengigkeiten'), meta: displayPart(r.fields.geprueft_am) })}
        onOpen={onOpenAbhaengigkeiten}
        onAdd={onAddAbhaengigkeiten}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('angebotsuebernahmen')}
        items={angebotsuebernahmenList.filter(r => extractRecordId(r.fields.beitrag) === record.record_id)}
        map={r => ({ name: displayNameOf('angebotsuebernahmen', r.fields as Record<string, unknown>) || appLabel('angebotsuebernahmen'), meta: displayPart(r.fields.uebernahmedatum) })}
        onOpen={onOpenAngebotsuebernahmen}
        onAdd={onAddAngebotsuebernahmen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.FACHBEITRAEGE} recordId={record.record_id} readOnly={!perms.canWrite('fachbeitraege')} />
    </>
  );
}
