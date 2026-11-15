import type { Beteiligte, Fachbeitraege, Angebotsvorhaben, Aufgaben, Angebotsuebernahmen, Entscheidungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';
import { displayNameOf, displayPart } from '@/lib/journey/rules';

export interface BeteiligteDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Beteiligte;
  /** 1:N „Fachbeiträge" (autor): VOLLE Liste — der Block filtert auf diesen Record. */
  fachbeitraegeList: Fachbeitraege[];
  /** Zeilen-Klick → overlay.push auf das Fachbeitraege-Detail (nie der Edit-Dialog). */
  onOpenFachbeitraege: (record: Fachbeitraege) => void;
  /** Kontextuelles „+": öffnet den Fachbeitraege-Dialog mit diesem Record vorgesetzt. */
  onAddFachbeitraege?: () => void;
  /** 1:N „Angebotsvorhaben" (projektleitung): VOLLE Liste — der Block filtert auf diesen Record. */
  angebotsvorhabenList: Angebotsvorhaben[];
  /** Zeilen-Klick → overlay.push auf das Angebotsvorhaben-Detail (nie der Edit-Dialog). */
  onOpenAngebotsvorhaben: (record: Angebotsvorhaben) => void;
  /** Kontextuelles „+": öffnet den Angebotsvorhaben-Dialog mit diesem Record vorgesetzt. */
  onAddAngebotsvorhaben?: () => void;
  /** 1:N „Aufgaben" (verantwortlicher): VOLLE Liste — der Block filtert auf diesen Record. */
  aufgabenList: Aufgaben[];
  /** Zeilen-Klick → overlay.push auf das Aufgaben-Detail (nie der Edit-Dialog). */
  onOpenAufgaben: (record: Aufgaben) => void;
  /** Kontextuelles „+": öffnet den Aufgaben-Dialog mit diesem Record vorgesetzt. */
  onAddAufgaben?: () => void;
  /** 1:N „Angebotsübernahmen" (uebernommen_von): VOLLE Liste — der Block filtert auf diesen Record. */
  angebotsuebernahmenList: Angebotsuebernahmen[];
  /** Zeilen-Klick → overlay.push auf das Angebotsuebernahmen-Detail (nie der Edit-Dialog). */
  onOpenAngebotsuebernahmen: (record: Angebotsuebernahmen) => void;
  /** Kontextuelles „+": öffnet den Angebotsuebernahmen-Dialog mit diesem Record vorgesetzt. */
  onAddAngebotsuebernahmen?: () => void;
  /** 1:N „Entscheidungen" (freigeber): VOLLE Liste — der Block filtert auf diesen Record. */
  entscheidungenFreigeberList: Entscheidungen[];
  /** Zeilen-Klick → overlay.push auf das Entscheidungen-Detail (nie der Edit-Dialog). */
  onOpenEntscheidungenFreigeber: (record: Entscheidungen) => void;
  /** Kontextuelles „+": öffnet den Entscheidungen-Dialog mit diesem Record vorgesetzt. */
  onAddEntscheidungenFreigeber?: () => void;
  /** 1:N „Entscheidungen" (entscheider): VOLLE Liste — der Block filtert auf diesen Record. */
  entscheidungenEntscheiderList: Entscheidungen[];
  /** Zeilen-Klick → overlay.push auf das Entscheidungen-Detail (nie der Edit-Dialog). */
  onOpenEntscheidungenEntscheider: (record: Entscheidungen) => void;
  /** Kontextuelles „+": öffnet den Entscheidungen-Dialog mit diesem Record vorgesetzt. */
  onAddEntscheidungenEntscheider?: () => void;
}

export function BeteiligteDetails({
  record,
  fachbeitraegeList,
  onOpenFachbeitraege,
  onAddFachbeitraege,
  angebotsvorhabenList,
  onOpenAngebotsvorhaben,
  onAddAngebotsvorhaben,
  aufgabenList,
  onOpenAufgaben,
  onAddAufgaben,
  angebotsuebernahmenList,
  onOpenAngebotsuebernahmen,
  onAddAngebotsuebernahmen,
  entscheidungenFreigeberList,
  onOpenEntscheidungenFreigeber,
  onAddEntscheidungenFreigeber,
  entscheidungenEntscheiderList,
  onOpenEntscheidungenEntscheider,
  onAddEntscheidungenEntscheider,
}: BeteiligteDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('beteiligte', 'entscheidungsgrenze')} value={record.fields.entscheidungsgrenze} format="text" />
        <RecordField label={fieldLabel('beteiligte', 'vorname')} value={record.fields.vorname} format="text" />
        <RecordField label={fieldLabel('beteiligte', 'nachname')} value={record.fields.nachname} format="text" />
        <RecordField label={fieldLabel('beteiligte', 'email')} value={record.fields.email} format="email" />
        <RecordField label={fieldLabel('beteiligte', 'rolle')} value={record.fields.rolle} format="text" />
        <RecordField label={fieldLabel('beteiligte', 'telefon')} value={record.fields.telefon} format="text" />
        <RecordField label={fieldLabel('beteiligte', 'fachbereich')} value={record.fields.fachbereich} format="pill" />
        <RecordField label={fieldLabel('beteiligte', 'aktiv')} value={record.fields.aktiv} format="bool" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('fachbeitraege')}
        items={fachbeitraegeList.filter(r => extractRecordId(r.fields.autor) === record.record_id)}
        map={r => ({ name: displayNameOf('fachbeitraege', r.fields as Record<string, unknown>) || appLabel('fachbeitraege'), meta: displayPart(r.fields.gueltig_von) })}
        onOpen={onOpenFachbeitraege}
        onAdd={onAddFachbeitraege}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('angebotsvorhaben')}
        items={angebotsvorhabenList.filter(r => extractRecordId(r.fields.projektleitung) === record.record_id)}
        map={r => ({ name: displayNameOf('angebotsvorhaben', r.fields as Record<string, unknown>) || appLabel('angebotsvorhaben'), meta: displayPart(r.fields.eingangsdatum) })}
        onOpen={onOpenAngebotsvorhaben}
        onAdd={onAddAngebotsvorhaben}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('aufgaben')}
        items={aufgabenList.filter(r => extractRecordId(r.fields.verantwortlicher) === record.record_id)}
        map={r => ({ name: displayNameOf('aufgaben', r.fields as Record<string, unknown>) || appLabel('aufgaben'), meta: displayPart(r.fields.faelligkeit) })}
        onOpen={onOpenAufgaben}
        onAdd={onAddAufgaben}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('angebotsuebernahmen')}
        items={angebotsuebernahmenList.filter(r => extractRecordId(r.fields.uebernommen_von) === record.record_id)}
        map={r => ({ name: displayNameOf('angebotsuebernahmen', r.fields as Record<string, unknown>) || appLabel('angebotsuebernahmen'), meta: displayPart(r.fields.uebernahmedatum) })}
        onOpen={onOpenAngebotsuebernahmen}
        onAdd={onAddAngebotsuebernahmen}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={`${appLabel('entscheidungen')} · ${fieldLabel('entscheidungen', 'freigeber')}`}
        items={entscheidungenFreigeberList.filter(r => extractRecordId(r.fields.freigeber) === record.record_id)}
        map={r => ({ name: displayNameOf('entscheidungen', r.fields as Record<string, unknown>) || appLabel('entscheidungen'), meta: displayPart(r.fields.freigabedatum) })}
        onOpen={onOpenEntscheidungenFreigeber}
        onAdd={onAddEntscheidungenFreigeber}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={`${appLabel('entscheidungen')} · ${fieldLabel('entscheidungen', 'entscheider')}`}
        items={entscheidungenEntscheiderList.filter(r => extractRecordId(r.fields.entscheider) === record.record_id)}
        map={r => ({ name: displayNameOf('entscheidungen', r.fields as Record<string, unknown>) || appLabel('entscheidungen'), meta: displayPart(r.fields.freigabedatum) })}
        onOpen={onOpenEntscheidungenEntscheider}
        onAdd={onAddEntscheidungenEntscheider}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.BETEILIGTE} recordId={record.record_id} readOnly={!perms.canWrite('beteiligte')} />
    </>
  );
}
