import type { Aufgaben, Angebotsvorhaben, Beteiligte, Entscheidungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';
import { displayNameOf, displayPart } from '@/lib/journey/rules';

export interface AufgabenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Aufgaben;
  /** N:1-Ziel „Angebotsvorhaben": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  angebotsvorhabenList: Angebotsvorhaben[];
  /** Klick auf die Angebotsvorhaben-Relation → overlay.push auf dessen Detail. */
  onOpenAngebotsvorhaben?: (record: Angebotsvorhaben) => void;
  /** N:1-Ziel „Beteiligte": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  beteiligteList: Beteiligte[];
  /** Klick auf die Beteiligte-Relation → overlay.push auf dessen Detail. */
  onOpenBeteiligte?: (record: Beteiligte) => void;
  /** N:1-Ziel „Aufgaben": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  aufgabenList: Aufgaben[];
  /** Klick auf die Aufgaben-Relation → overlay.push auf dessen Detail. */
  onOpenAufgaben?: (record: Aufgaben) => void;
  /** 1:N „Entscheidungen" (aufgabe): VOLLE Liste — der Block filtert auf diesen Record. */
  entscheidungenList: Entscheidungen[];
  /** Zeilen-Klick → overlay.push auf das Entscheidungen-Detail (nie der Edit-Dialog). */
  onOpenEntscheidungen: (record: Entscheidungen) => void;
  /** Kontextuelles „+": öffnet den Entscheidungen-Dialog mit diesem Record vorgesetzt. */
  onAddEntscheidungen?: () => void;
}

export function AufgabenDetails({
  record,
  angebotsvorhabenList,
  onOpenAngebotsvorhaben,
  beteiligteList,
  onOpenBeteiligte,
  aufgabenList,
  onOpenAufgaben,
  entscheidungenList,
  onOpenEntscheidungen,
  onAddEntscheidungen,
}: AufgabenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const vorhabenTarget = angebotsvorhabenList.find(r => r.record_id === extractRecordId(record.fields.vorhaben));
  const verantwortlicherTarget = beteiligteList.find(r => r.record_id === extractRecordId(record.fields.verantwortlicher));
  const ausloesende_aufgabeTarget = aufgabenList.find(r => r.record_id === extractRecordId(record.fields.ausloesende_aufgabe));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('aufgaben', 'titel')} value={record.fields.titel} format="text" />
        <RecordField label={fieldLabel('aufgaben', 'art')} value={record.fields.art} format="pill" />
        <RecordField label={fieldLabel('aufgaben', 'faelligkeit')} value={record.fields.faelligkeit} format="date" />
        <RecordField label={fieldLabel('aufgaben', 'status')} value={record.fields.status} format="pill" />
        <RecordField label={fieldLabel('aufgaben', 'ausloeser')} value={record.fields.ausloeser} format="pill" />
        <RecordField label={fieldLabel('aufgaben', 'fragestellung')} value={record.fields.fragestellung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('aufgaben', 'ergebnis')} value={record.fields.ergebnis} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('aufgaben', 'folgeaufgabe_noetig')} value={record.fields.folgeaufgabe_noetig} format="bool" />
        <RecordField label={fieldLabel('aufgaben', 'folgeaufgabe_hinweis')} value={record.fields.folgeaufgabe_hinweis} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('aufgaben', 'vorhaben')}
          name={vorhabenTarget ? (displayNameOf('angebotsvorhaben', vorhabenTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={[vorhabenTarget?.fields.kundenname, vorhabenTarget?.fields.anfragenummer].filter(Boolean).join(' · ') || undefined}
          onClick={vorhabenTarget && onOpenAngebotsvorhaben ? () => onOpenAngebotsvorhaben!(vorhabenTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('aufgaben', 'verantwortlicher')}
          name={verantwortlicherTarget ? (displayNameOf('beteiligte', verantwortlicherTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={[verantwortlicherTarget?.fields.email, verantwortlicherTarget?.fields.telefon].filter(Boolean).join(' · ') || undefined}
          onClick={verantwortlicherTarget && onOpenBeteiligte ? () => onOpenBeteiligte!(verantwortlicherTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('aufgaben', 'ausloesende_aufgabe')}
          name={ausloesende_aufgabeTarget ? (displayNameOf('aufgaben', ausloesende_aufgabeTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={undefined}
          onClick={ausloesende_aufgabeTarget && onOpenAufgaben ? () => onOpenAufgaben!(ausloesende_aufgabeTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('entscheidungen')}
        items={entscheidungenList.filter(r => extractRecordId(r.fields.aufgabe) === record.record_id)}
        map={r => ({ name: displayNameOf('entscheidungen', r.fields as Record<string, unknown>) || appLabel('entscheidungen'), meta: displayPart(r.fields.entscheidungsdatum) })}
        onOpen={onOpenEntscheidungen}
        onAdd={onAddEntscheidungen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.AUFGABEN} recordId={record.record_id} readOnly={!perms.canWrite('aufgaben')} />
    </>
  );
}
