import type { Angebotsvarianten, Angebotsvorhaben, Fachbeitraege, Abhaengigkeiten, Angebotsuebernahmen, Entscheidungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';
import { displayNameOf, displayPart } from '@/lib/journey/rules';

export interface AngebotsvariantenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Angebotsvarianten;
  /** N:1-Ziel „Angebotsvarianten": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  angebotsvariantenList: Angebotsvarianten[];
  /** Klick auf die Angebotsvarianten-Relation → overlay.push auf dessen Detail. */
  onOpenAngebotsvarianten?: (record: Angebotsvarianten) => void;
  /** N:1-Ziel „Angebotsvorhaben": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  angebotsvorhabenList: Angebotsvorhaben[];
  /** Klick auf die Angebotsvorhaben-Relation → overlay.push auf dessen Detail. */
  onOpenAngebotsvorhaben?: (record: Angebotsvorhaben) => void;
  /** 1:N „Fachbeiträge" (variante): VOLLE Liste — der Block filtert auf diesen Record. */
  fachbeitraegeList: Fachbeitraege[];
  /** Zeilen-Klick → overlay.push auf das Fachbeitraege-Detail (nie der Edit-Dialog). */
  onOpenFachbeitraege: (record: Fachbeitraege) => void;
  /** Kontextuelles „+": öffnet den Fachbeitraege-Dialog mit diesem Record vorgesetzt. */
  onAddFachbeitraege?: () => void;
  /** 1:N „Abhängigkeiten" (grundlage_variante): VOLLE Liste — der Block filtert auf diesen Record. */
  abhaengigkeitenList: Abhaengigkeiten[];
  /** Zeilen-Klick → overlay.push auf das Abhaengigkeiten-Detail (nie der Edit-Dialog). */
  onOpenAbhaengigkeiten: (record: Abhaengigkeiten) => void;
  /** Kontextuelles „+": öffnet den Abhaengigkeiten-Dialog mit diesem Record vorgesetzt. */
  onAddAbhaengigkeiten?: () => void;
  /** 1:N „Angebotsübernahmen" (variante): VOLLE Liste — der Block filtert auf diesen Record. */
  angebotsuebernahmenList: Angebotsuebernahmen[];
  /** Zeilen-Klick → overlay.push auf das Angebotsuebernahmen-Detail (nie der Edit-Dialog). */
  onOpenAngebotsuebernahmen: (record: Angebotsuebernahmen) => void;
  /** Kontextuelles „+": öffnet den Angebotsuebernahmen-Dialog mit diesem Record vorgesetzt. */
  onAddAngebotsuebernahmen?: () => void;
  /** 1:N „Entscheidungen" (variante): VOLLE Liste — der Block filtert auf diesen Record. */
  entscheidungenList: Entscheidungen[];
  /** Zeilen-Klick → overlay.push auf das Entscheidungen-Detail (nie der Edit-Dialog). */
  onOpenEntscheidungen: (record: Entscheidungen) => void;
  /** Kontextuelles „+": öffnet den Entscheidungen-Dialog mit diesem Record vorgesetzt. */
  onAddEntscheidungen?: () => void;
}

export function AngebotsvariantenDetails({
  record,
  angebotsvariantenList,
  onOpenAngebotsvarianten,
  angebotsvorhabenList,
  onOpenAngebotsvorhaben,
  fachbeitraegeList,
  onOpenFachbeitraege,
  onAddFachbeitraege,
  abhaengigkeitenList,
  onOpenAbhaengigkeiten,
  onAddAbhaengigkeiten,
  angebotsuebernahmenList,
  onOpenAngebotsuebernahmen,
  onAddAngebotsuebernahmen,
  entscheidungenList,
  onOpenEntscheidungen,
  onAddEntscheidungen,
}: AngebotsvariantenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const vorgaengerversionTarget = angebotsvariantenList.find(r => r.record_id === extractRecordId(record.fields.vorgaengerversion));
  const vorhabenTarget = angebotsvorhabenList.find(r => r.record_id === extractRecordId(record.fields.vorhaben));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('angebotsvarianten', 'angebotspreis')} value={record.fields.angebotspreis} format="text" />
        <RecordField label={fieldLabel('angebotsvarianten', 'akzeptierte_risiken')} value={record.fields.akzeptierte_risiken} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('angebotsvarianten', 'version')} value={record.fields.version} format="text" />
        <RecordField label={fieldLabel('angebotsvarianten', 'vertragsbedingungen')} value={record.fields.vertragsbedingungen} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('angebotsvarianten', 'status')} value={record.fields.status} format="pill" />
        <RecordField label={fieldLabel('angebotsvarianten', 'herstellkosten')} value={record.fields.herstellkosten} format="text" />
        <RecordField label={fieldLabel('angebotsvarianten', 'beschaffungskosten')} value={record.fields.beschaffungskosten} format="text" />
        <RecordField label={fieldLabel('angebotsvarianten', 'aufwand_stunden')} value={record.fields.aufwand_stunden} format="text" />
        <RecordField label={fieldLabel('angebotsvarianten', 'variantenbezeichnung')} value={record.fields.variantenbezeichnung} format="text" />
        <RecordField label={fieldLabel('angebotsvarianten', 'beschreibung')} value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('angebotsvarianten', 'menge')} value={record.fields.menge} format="text" />
        <RecordField label={fieldLabel('angebotsvarianten', 'teillieferung')} value={record.fields.teillieferung} format="bool" />
        <RecordField label={fieldLabel('angebotsvarianten', 'liefertermin')} value={record.fields.liefertermin} format="date" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('angebotsvarianten', 'vorgaengerversion')}
          name={vorgaengerversionTarget ? (displayNameOf('angebotsvarianten', vorgaengerversionTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={undefined}
          onClick={vorgaengerversionTarget && onOpenAngebotsvarianten ? () => onOpenAngebotsvarianten!(vorgaengerversionTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('angebotsvarianten', 'vorhaben')}
          name={vorhabenTarget ? (displayNameOf('angebotsvorhaben', vorhabenTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={[vorhabenTarget?.fields.kundenname, vorhabenTarget?.fields.anfragenummer].filter(Boolean).join(' · ') || undefined}
          onClick={vorhabenTarget && onOpenAngebotsvorhaben ? () => onOpenAngebotsvorhaben!(vorhabenTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('fachbeitraege')}
        items={fachbeitraegeList.filter(r => extractRecordId(r.fields.variante) === record.record_id)}
        map={r => ({ name: displayNameOf('fachbeitraege', r.fields as Record<string, unknown>) || appLabel('fachbeitraege'), meta: displayPart(r.fields.gueltig_von) })}
        onOpen={onOpenFachbeitraege}
        onAdd={onAddFachbeitraege}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('abhaengigkeiten')}
        items={abhaengigkeitenList.filter(r => extractRecordId(r.fields.grundlage_variante) === record.record_id)}
        map={r => ({ name: displayNameOf('abhaengigkeiten', r.fields as Record<string, unknown>) || appLabel('abhaengigkeiten'), meta: displayPart(r.fields.geprueft_am) })}
        onOpen={onOpenAbhaengigkeiten}
        onAdd={onAddAbhaengigkeiten}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('angebotsuebernahmen')}
        items={angebotsuebernahmenList.filter(r => extractRecordId(r.fields.variante) === record.record_id)}
        map={r => ({ name: displayNameOf('angebotsuebernahmen', r.fields as Record<string, unknown>) || appLabel('angebotsuebernahmen'), meta: displayPart(r.fields.uebernahmedatum) })}
        onOpen={onOpenAngebotsuebernahmen}
        onAdd={onAddAngebotsuebernahmen}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('entscheidungen')}
        items={entscheidungenList.filter(r => extractRecordId(r.fields.variante) === record.record_id)}
        map={r => ({ name: displayNameOf('entscheidungen', r.fields as Record<string, unknown>) || appLabel('entscheidungen'), meta: displayPart(r.fields.freigabedatum) })}
        onOpen={onOpenEntscheidungen}
        onAdd={onAddEntscheidungen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.ANGEBOTSVARIANTEN} recordId={record.record_id} readOnly={!perms.canWrite('angebotsvarianten')} />
    </>
  );
}
