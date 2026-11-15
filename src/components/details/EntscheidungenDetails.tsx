import type { Entscheidungen, Angebotsvarianten, Beteiligte, Angebotsvorhaben, Aufgaben, Angebotsuebernahmen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';
import { displayNameOf, displayPart } from '@/lib/journey/rules';

export interface EntscheidungenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Entscheidungen;
  /** N:1-Ziel „Angebotsvarianten": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  angebotsvariantenList: Angebotsvarianten[];
  /** Klick auf die Angebotsvarianten-Relation → overlay.push auf dessen Detail. */
  onOpenAngebotsvarianten?: (record: Angebotsvarianten) => void;
  /** N:1-Ziel „Beteiligte": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  beteiligteList: Beteiligte[];
  /** Klick auf die Beteiligte-Relation → overlay.push auf dessen Detail. */
  onOpenBeteiligte?: (record: Beteiligte) => void;
  /** N:1-Ziel „Angebotsvorhaben": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  angebotsvorhabenList: Angebotsvorhaben[];
  /** Klick auf die Angebotsvorhaben-Relation → overlay.push auf dessen Detail. */
  onOpenAngebotsvorhaben?: (record: Angebotsvorhaben) => void;
  /** N:1-Ziel „Aufgaben": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  aufgabenList: Aufgaben[];
  /** Klick auf die Aufgaben-Relation → overlay.push auf dessen Detail. */
  onOpenAufgaben?: (record: Aufgaben) => void;
  /** 1:N „Angebotsübernahmen" (entscheidung): VOLLE Liste — der Block filtert auf diesen Record. */
  angebotsuebernahmenList: Angebotsuebernahmen[];
  /** Zeilen-Klick → overlay.push auf das Angebotsuebernahmen-Detail (nie der Edit-Dialog). */
  onOpenAngebotsuebernahmen: (record: Angebotsuebernahmen) => void;
  /** Kontextuelles „+": öffnet den Angebotsuebernahmen-Dialog mit diesem Record vorgesetzt. */
  onAddAngebotsuebernahmen?: () => void;
}

export function EntscheidungenDetails({
  record,
  angebotsvariantenList,
  onOpenAngebotsvarianten,
  beteiligteList,
  onOpenBeteiligte,
  angebotsvorhabenList,
  onOpenAngebotsvorhaben,
  aufgabenList,
  onOpenAufgaben,
  angebotsuebernahmenList,
  onOpenAngebotsuebernahmen,
  onAddAngebotsuebernahmen,
}: EntscheidungenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const varianteTarget = angebotsvariantenList.find(r => r.record_id === extractRecordId(record.fields.variante));
  const freigeberTarget = beteiligteList.find(r => r.record_id === extractRecordId(record.fields.freigeber));
  const vorhabenTarget = angebotsvorhabenList.find(r => r.record_id === extractRecordId(record.fields.vorhaben));
  const entscheiderTarget = beteiligteList.find(r => r.record_id === extractRecordId(record.fields.entscheider));
  const aufgabeTarget = aufgabenList.find(r => r.record_id === extractRecordId(record.fields.aufgabe));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('entscheidungen', 'freigabestatus')} value={record.fields.freigabestatus} format="pill" />
        <RecordField label={fieldLabel('entscheidungen', 'freigabedatum')} value={record.fields.freigabedatum} format="date" />
        <RecordField label={fieldLabel('entscheidungen', 'frage')} value={record.fields.frage} format="text" />
        <RecordField label={fieldLabel('entscheidungen', 'ergebnis')} value={record.fields.ergebnis} format="pill" />
        <RecordField label={fieldLabel('entscheidungen', 'begruendung')} value={record.fields.begruendung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('entscheidungen', 'bedingungen')} value={record.fields.bedingungen} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('entscheidungen', 'finanzielle_auswirkung')} value={record.fields.finanzielle_auswirkung} format="text" />
        <RecordField label={fieldLabel('entscheidungen', 'entscheidungsdatum')} value={record.fields.entscheidungsdatum} format="date" />
        <RecordField label={fieldLabel('entscheidungen', 'freigabe_noetig')} value={record.fields.freigabe_noetig} format="bool" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('entscheidungen', 'variante')}
          name={varianteTarget ? (displayNameOf('angebotsvarianten', varianteTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={undefined}
          onClick={varianteTarget && onOpenAngebotsvarianten ? () => onOpenAngebotsvarianten!(varianteTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('entscheidungen', 'freigeber')}
          name={freigeberTarget ? (displayNameOf('beteiligte', freigeberTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={[freigeberTarget?.fields.email, freigeberTarget?.fields.telefon].filter(Boolean).join(' · ') || undefined}
          onClick={freigeberTarget && onOpenBeteiligte ? () => onOpenBeteiligte!(freigeberTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('entscheidungen', 'vorhaben')}
          name={vorhabenTarget ? (displayNameOf('angebotsvorhaben', vorhabenTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={[vorhabenTarget?.fields.kundenname, vorhabenTarget?.fields.anfragenummer].filter(Boolean).join(' · ') || undefined}
          onClick={vorhabenTarget && onOpenAngebotsvorhaben ? () => onOpenAngebotsvorhaben!(vorhabenTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('entscheidungen', 'entscheider')}
          name={entscheiderTarget ? (displayNameOf('beteiligte', entscheiderTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={[entscheiderTarget?.fields.email, entscheiderTarget?.fields.telefon].filter(Boolean).join(' · ') || undefined}
          onClick={entscheiderTarget && onOpenBeteiligte ? () => onOpenBeteiligte!(entscheiderTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('entscheidungen', 'aufgabe')}
          name={aufgabeTarget ? (displayNameOf('aufgaben', aufgabeTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={undefined}
          onClick={aufgabeTarget && onOpenAufgaben ? () => onOpenAufgaben!(aufgabeTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('angebotsuebernahmen')}
        items={angebotsuebernahmenList.filter(r => extractRecordId(r.fields.entscheidung) === record.record_id)}
        map={r => ({ name: displayNameOf('angebotsuebernahmen', r.fields as Record<string, unknown>) || appLabel('angebotsuebernahmen'), meta: displayPart(r.fields.uebernahmedatum) })}
        onOpen={onOpenAngebotsuebernahmen}
        onAdd={onAddAngebotsuebernahmen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.ENTSCHEIDUNGEN} recordId={record.record_id} readOnly={!perms.canWrite('entscheidungen')} />
    </>
  );
}
