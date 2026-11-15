import type { Angebotsvorhaben, Beteiligte, Anforderungen, Fachbeitraege, Angebotsvarianten, Abhaengigkeiten, Aufgaben, Angebotsuebernahmen, Entscheidungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';
import { displayNameOf, displayPart } from '@/lib/journey/rules';

export interface AngebotsvorhabenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Angebotsvorhaben;
  /** N:1-Ziel „Beteiligte": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  beteiligteList: Beteiligte[];
  /** Klick auf die Beteiligte-Relation → overlay.push auf dessen Detail. */
  onOpenBeteiligte?: (record: Beteiligte) => void;
  /** 1:N „Anforderungen" (vorhaben): VOLLE Liste — der Block filtert auf diesen Record. */
  anforderungenList: Anforderungen[];
  /** Zeilen-Klick → overlay.push auf das Anforderungen-Detail (nie der Edit-Dialog). */
  onOpenAnforderungen: (record: Anforderungen) => void;
  /** Kontextuelles „+": öffnet den Anforderungen-Dialog mit diesem Record vorgesetzt. */
  onAddAnforderungen?: () => void;
  /** 1:N „Fachbeiträge" (vorhaben): VOLLE Liste — der Block filtert auf diesen Record. */
  fachbeitraegeList: Fachbeitraege[];
  /** Zeilen-Klick → overlay.push auf das Fachbeitraege-Detail (nie der Edit-Dialog). */
  onOpenFachbeitraege: (record: Fachbeitraege) => void;
  /** Kontextuelles „+": öffnet den Fachbeitraege-Dialog mit diesem Record vorgesetzt. */
  onAddFachbeitraege?: () => void;
  /** 1:N „Angebotsvarianten" (vorhaben): VOLLE Liste — der Block filtert auf diesen Record. */
  angebotsvariantenList: Angebotsvarianten[];
  /** Zeilen-Klick → overlay.push auf das Angebotsvarianten-Detail (nie der Edit-Dialog). */
  onOpenAngebotsvarianten: (record: Angebotsvarianten) => void;
  /** Kontextuelles „+": öffnet den Angebotsvarianten-Dialog mit diesem Record vorgesetzt. */
  onAddAngebotsvarianten?: () => void;
  /** 1:N „Abhängigkeiten" (vorhaben): VOLLE Liste — der Block filtert auf diesen Record. */
  abhaengigkeitenList: Abhaengigkeiten[];
  /** Zeilen-Klick → overlay.push auf das Abhaengigkeiten-Detail (nie der Edit-Dialog). */
  onOpenAbhaengigkeiten: (record: Abhaengigkeiten) => void;
  /** Kontextuelles „+": öffnet den Abhaengigkeiten-Dialog mit diesem Record vorgesetzt. */
  onAddAbhaengigkeiten?: () => void;
  /** 1:N „Aufgaben" (vorhaben): VOLLE Liste — der Block filtert auf diesen Record. */
  aufgabenList: Aufgaben[];
  /** Zeilen-Klick → overlay.push auf das Aufgaben-Detail (nie der Edit-Dialog). */
  onOpenAufgaben: (record: Aufgaben) => void;
  /** Kontextuelles „+": öffnet den Aufgaben-Dialog mit diesem Record vorgesetzt. */
  onAddAufgaben?: () => void;
  /** 1:N „Angebotsübernahmen" (vorhaben): VOLLE Liste — der Block filtert auf diesen Record. */
  angebotsuebernahmenList: Angebotsuebernahmen[];
  /** Zeilen-Klick → overlay.push auf das Angebotsuebernahmen-Detail (nie der Edit-Dialog). */
  onOpenAngebotsuebernahmen: (record: Angebotsuebernahmen) => void;
  /** Kontextuelles „+": öffnet den Angebotsuebernahmen-Dialog mit diesem Record vorgesetzt. */
  onAddAngebotsuebernahmen?: () => void;
  /** 1:N „Entscheidungen" (vorhaben): VOLLE Liste — der Block filtert auf diesen Record. */
  entscheidungenList: Entscheidungen[];
  /** Zeilen-Klick → overlay.push auf das Entscheidungen-Detail (nie der Edit-Dialog). */
  onOpenEntscheidungen: (record: Entscheidungen) => void;
  /** Kontextuelles „+": öffnet den Entscheidungen-Dialog mit diesem Record vorgesetzt. */
  onAddEntscheidungen?: () => void;
}

export function AngebotsvorhabenDetails({
  record,
  beteiligteList,
  onOpenBeteiligte,
  anforderungenList,
  onOpenAnforderungen,
  onAddAnforderungen,
  fachbeitraegeList,
  onOpenFachbeitraege,
  onAddFachbeitraege,
  angebotsvariantenList,
  onOpenAngebotsvarianten,
  onAddAngebotsvarianten,
  abhaengigkeitenList,
  onOpenAbhaengigkeiten,
  onAddAbhaengigkeiten,
  aufgabenList,
  onOpenAufgaben,
  onAddAufgaben,
  angebotsuebernahmenList,
  onOpenAngebotsuebernahmen,
  onAddAngebotsuebernahmen,
  entscheidungenList,
  onOpenEntscheidungen,
  onAddEntscheidungen,
}: AngebotsvorhabenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const projektleitungTarget = beteiligteList.find(r => r.record_id === extractRecordId(record.fields.projektleitung));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('angebotsvorhaben', 'bezeichnung')} value={record.fields.bezeichnung} format="text" />
        <RecordField label={fieldLabel('angebotsvorhaben', 'kundenname')} value={record.fields.kundenname} format="text" />
        <RecordField label={fieldLabel('angebotsvorhaben', 'anfragenummer')} value={record.fields.anfragenummer} format="text" />
        <RecordField label={fieldLabel('angebotsvorhaben', 'eingangsdatum')} value={record.fields.eingangsdatum} format="date" />
        <RecordField label={fieldLabel('angebotsvorhaben', 'abgabefrist')} value={record.fields.abgabefrist} format="date" />
        <RecordField label={fieldLabel('angebotsvorhaben', 'anfragebeschreibung')} value={record.fields.anfragebeschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('angebotsvorhaben', 'liefergegenstand')} value={record.fields.liefergegenstand} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('angebotsvorhaben', 'phase')} value={record.fields.phase} format="pill" />
        <RecordField label={fieldLabel('angebotsvorhaben', 'prioritaet')} value={record.fields.prioritaet} format="pill" />
        <RecordField label={fieldLabel('angebotsvorhaben', 'auftragsvolumen')} value={record.fields.auftragsvolumen} format="text" />
        <RecordField label={fieldLabel('angebotsvorhaben', 'besonderheiten')} value={record.fields.besonderheiten} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('angebotsvorhaben', 'projektleitung')}
          name={projektleitungTarget ? (displayNameOf('beteiligte', projektleitungTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={[projektleitungTarget?.fields.email, projektleitungTarget?.fields.telefon].filter(Boolean).join(' · ') || undefined}
          onClick={projektleitungTarget && onOpenBeteiligte ? () => onOpenBeteiligte!(projektleitungTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('anforderungen')}
        items={anforderungenList.filter(r => extractRecordId(r.fields.vorhaben) === record.record_id)}
        map={r => ({ name: displayNameOf('anforderungen', r.fields as Record<string, unknown>) || appLabel('anforderungen'), meta: displayPart(r.fields.gueltig_ab) })}
        onOpen={onOpenAnforderungen}
        onAdd={onAddAnforderungen}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('fachbeitraege')}
        items={fachbeitraegeList.filter(r => extractRecordId(r.fields.vorhaben) === record.record_id)}
        map={r => ({ name: displayNameOf('fachbeitraege', r.fields as Record<string, unknown>) || appLabel('fachbeitraege'), meta: displayPart(r.fields.gueltig_von) })}
        onOpen={onOpenFachbeitraege}
        onAdd={onAddFachbeitraege}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('angebotsvarianten')}
        items={angebotsvariantenList.filter(r => extractRecordId(r.fields.vorhaben) === record.record_id)}
        map={r => ({ name: displayNameOf('angebotsvarianten', r.fields as Record<string, unknown>) || appLabel('angebotsvarianten'), meta: displayPart(r.fields.liefertermin) })}
        onOpen={onOpenAngebotsvarianten}
        onAdd={onAddAngebotsvarianten}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('abhaengigkeiten')}
        items={abhaengigkeitenList.filter(r => extractRecordId(r.fields.vorhaben) === record.record_id)}
        map={r => ({ name: displayNameOf('abhaengigkeiten', r.fields as Record<string, unknown>) || appLabel('abhaengigkeiten'), meta: displayPart(r.fields.geprueft_am) })}
        onOpen={onOpenAbhaengigkeiten}
        onAdd={onAddAbhaengigkeiten}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('aufgaben')}
        items={aufgabenList.filter(r => extractRecordId(r.fields.vorhaben) === record.record_id)}
        map={r => ({ name: displayNameOf('aufgaben', r.fields as Record<string, unknown>) || appLabel('aufgaben'), meta: displayPart(r.fields.faelligkeit) })}
        onOpen={onOpenAufgaben}
        onAdd={onAddAufgaben}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('angebotsuebernahmen')}
        items={angebotsuebernahmenList.filter(r => extractRecordId(r.fields.vorhaben) === record.record_id)}
        map={r => ({ name: displayNameOf('angebotsuebernahmen', r.fields as Record<string, unknown>) || appLabel('angebotsuebernahmen'), meta: displayPart(r.fields.uebernahmedatum) })}
        onOpen={onOpenAngebotsuebernahmen}
        onAdd={onAddAngebotsuebernahmen}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('entscheidungen')}
        items={entscheidungenList.filter(r => extractRecordId(r.fields.vorhaben) === record.record_id)}
        map={r => ({ name: displayNameOf('entscheidungen', r.fields as Record<string, unknown>) || appLabel('entscheidungen'), meta: displayPart(r.fields.freigabedatum) })}
        onOpen={onOpenEntscheidungen}
        onAdd={onAddEntscheidungen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.ANGEBOTSVORHABEN} recordId={record.record_id} readOnly={!perms.canWrite('angebotsvorhaben')} />
    </>
  );
}
