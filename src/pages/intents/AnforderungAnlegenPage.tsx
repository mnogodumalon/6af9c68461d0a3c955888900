/**
 * Anforderung anlegen — 4-Schritt-Wizard plus Prüfen.
 * Steps: 1) Vorhaben wählen → 2) Titel, Beschreibung, Quellenart → 3) Quellenangabe & Gültig-ab →
 *        4) Vorgängerversion (optional) → 5) Prüfen & anlegen.
 * Reads: angebotsvorhaben, anforderungen (Vorgängerversion). Writes: anforderungen (status 'entwurf' vom Hook gesetzt).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup, fieldNumber } from '@/lib/journey';
import { useAnforderungAnlegenFlow } from '@/lib/journey/flows/AnforderungAnlegen';
import { tx } from '@/i18n';

export default function AnforderungAnlegenPage() {
  const [step, setStep] = useState(1);
  const flow = useAnforderungAnlegenFlow({
    steps: { vorhaben: 1, titel: 2, beschreibung: 2, quellenart: 2, quellenangabe: 3, gueltig_ab: 3, vorgaengerversion: 4 },
    initial: { gueltig_ab: format(new Date(), 'yyyy-MM-dd') },
    items: {
      vorhaben: r => ({ id: r.id, title: fieldText(r, 'bezeichnung'), subtitle: fieldText(r, 'kundenname') }),
      vorgaengerversion: r => ({
        id: r.id,
        title: fieldText(r, 'titel'),
        subtitle: `${fieldLookup(r, 'quellenart')?.label ?? ''} · ${tx('Version')} ${fieldNumber(r, 'version') ?? '?'}`,
      }),
    },
  });

  const result = flow.submit.result;

  return (
    <IntentWizardShell
      title={tx('Anforderung anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Eine neue Anforderung zu einem Angebotsvorhaben erfassen und ihre Quelle festhalten.'),
        needs: [tx('Das Angebotsvorhaben'), tx('Titel und Quelle der Anforderung')],
      }}
    >
      <WizardStep label={tx('Vorhaben')} description={tx('Zu welchem Angebotsvorhaben gehört die Anforderung?')}>
        <EntitySelectStep
          {...flow.picks.vorhaben.select}
          {...flow.pick('vorhaben')}
          searchPlaceholder={tx('Vorhaben oder Kunde suchen …')}
        />
      </WizardStep>

      <WizardStep label={tx('Inhalt')} description={tx('Titel, Beschreibung und Art der Quelle eintragen.')} needs={['vorhaben']}>
        <div className="space-y-4">
          <Bound form={flow.forms.anforderungen} name="titel" />
          <Bound form={flow.forms.anforderungen} name="beschreibung" rows={4} />
          <Bound form={flow.forms.anforderungen} name="quellenart" />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Quelle')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Quelle')} description={tx('Woher stammt die Anforderung und ab wann gilt sie?')}>
        <div className="space-y-4">
          <Bound form={flow.forms.anforderungen} name="quellenangabe" />
          <Bound form={flow.forms.anforderungen} name="gueltig_ab" />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => flow.validateStep(3)}
            nextStepLabel={tx('Vorgängerversion')}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Vorgängerversion')}
        description={tx('Ersetzt die Anforderung eine frühere Version? Dann wähle sie aus, sonst überspringe den Schritt.')}
      >
        <div className="space-y-4">
          <EntitySelectStep
            {...flow.picks.vorgaengerversion.select}
            {...flow.pick('vorgaengerversion')}
            searchPlaceholder={tx('Titel suchen …')}
            emptyText={tx('Es gibt keine gültige Anforderung, die als Vorgänger infrage kommt. Du kannst den Schritt überspringen.')}
          />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => flow.validateStep(4)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            variants={flow.actions}
            items={[{ key: 'status-default', label: tx('Status'), value: tx('Entwurf') }]}
            whatHappensNext={tx('Die Versionsnummer vergibt das System. Die Anforderung startet als Entwurf.')}
          />
        )}
      </WizardStep>

      {result && (
        <SuccessStep
          result={result}
          forms={flow.formList}
          submit={flow.submit}
          facts={[
            { label: tx('Titel'), value: fieldText(result.primary, 'titel') },
            { label: tx('Status'), value: fieldLookup(result.primary, 'status')?.label ?? '' },
          ]}
          next={[
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
