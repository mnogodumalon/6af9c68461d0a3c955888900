import type { Angebotsvarianten, Angebotsvorhaben } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { usePermissions } from '@/lib/permissions';
import { displayNameOf } from '@/lib/journey/rules';

export interface AngebotsvariantenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Angebotsvarianten;
  /** N:1-Ziel „Angebotsvorhaben": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  angebotsvorhabenList: Angebotsvorhaben[];
  /** Klick auf die Angebotsvorhaben-Relation → overlay.push auf dessen Detail. */
  onOpenAngebotsvorhaben?: (record: Angebotsvorhaben) => void;
}

export function AngebotsvariantenDetails({
  record,
  angebotsvorhabenList,
  onOpenAngebotsvorhaben,
}: AngebotsvariantenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const vorhabenTarget = angebotsvorhabenList.find(r => r.record_id === extractRecordId(record.fields.vorhaben));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('angebotsvarianten', 'angebotspreis')} value={record.fields.angebotspreis} format="text" />
        <RecordField label={fieldLabel('angebotsvarianten', 'akzeptierte_risiken')} value={record.fields.akzeptierte_risiken} format="longtext" className="md:col-span-2" />
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
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('angebotsvarianten', 'vorhaben')}
          name={vorhabenTarget ? (displayNameOf('angebotsvorhaben', vorhabenTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={[vorhabenTarget?.fields.kundenname, vorhabenTarget?.fields.anfragenummer].filter(Boolean).join(' · ') || undefined}
          onClick={vorhabenTarget && onOpenAngebotsvorhaben ? () => onOpenAngebotsvorhaben!(vorhabenTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.ANGEBOTSVARIANTEN} recordId={record.record_id} readOnly={!perms.canWrite('angebotsvarianten')} />
    </>
  );
}
