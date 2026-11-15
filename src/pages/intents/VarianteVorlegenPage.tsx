/**
 * Variante dem Kunden vorlegen — 3-Schritt-Wizard.
 * Steps: 1) Vorhaben wählen → 2) Intern freigegebene Variante wählen → 3) Bestätigen & vorlegen.
 * Reads: angebotsvorhaben, angebotsvarianten. Writes: angebotsvarianten (status), angebotsvorhaben (phase = angebot_abgegeben)
 * via useVarianteVorlegenFlow.
 * Composes: IntentWizardShell, EntitySelectStep, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldNumber, fieldLookup } from '@/lib/journey';
import { useVarianteVorlegenFlow } from '@/lib/journey/flows/VarianteVorlegen';
import { formatCurrency } from '@/lib/formatters';
import { tx } from '@/i18n';

export default function VarianteVorlegenPage() {
  const [step, setStep] = useState(1);

  const flow = useVarianteVorlegenFlow({
    steps: { angebotsvorhaben: 1, angebotsvarianten: 2 },
    items: {
      angebotsvorhaben: r => ({
        id: r.id,
        title: fieldText(r, 'bezeichnung'),
        subtitle: fieldText(r, 'kundenname'),
        status: fieldLookup(r, 'phase') ?? undefined,
      }),
      angebotsvarianten: r => {
        const preis = fieldNumber(r, 'angebotspreis');
        return {
          id: r.id,
          title: fieldText(r, 'variantenbezeichnung'),
          subtitle: preis != null ? formatCurrency(preis) : undefined,
          status: fieldLookup(r, 'status') ?? undefined,
        };
      },
    },
  });

  return (
    <IntentWizardShell
      title={tx('Variante vorlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Eine freigegebene Variante dem Kunden vorlegen und das Vorhaben abschließen.'),
        needs: [tx('Ein Angebotsvorhaben'), tx('Eine intern freigegebene Variante')],
      }}
    >
      <WizardStep label={tx('Vorhaben')} description={tx('Für welches Vorhaben legst du eine Variante vor?')}>
        <EntitySelectStep
          {...flow.picks.angebotsvorhaben.select}
          {...flow.pick('angebotsvorhaben')}
          searchPlaceholder={tx('Vorhaben oder Kunde suchen …')}
        />
      </WizardStep>
      <WizardStep
        label={tx('Variante')}
        description={tx('Welche intern freigegebene Variante geht an den Kunden?')}
        needs={['angebotsvorhaben']}
      >
        <EntitySelectStep
          {...flow.picks.angebotsvarianten.select}
          {...flow.pick('angebotsvarianten')}
          emptyText={tx('Zu diesem Vorhaben gibt es keine intern freigegebene Variante.')}
          searchPlaceholder={tx('Variante suchen …')}
        />
      </WizardStep>
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              { key: 'neuer-status', label: tx('Status der Variante'), value: tx('Vorgelegt') },
              { key: 'neue-phase', label: tx('Phase des Vorhabens'), value: tx('Angebot abgegeben') },
            ]}
            whatHappensNext={tx('Die übrigen Varianten bleiben unverändert; das Vorhaben gilt als abgegeben.')}
          />
        )}
      </WizardStep>
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          undo={flow.undo}
          next={[
            { label: tx('Angebotsvariante erfassen'), href: '#/intents/variante-erfassen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Mit „Vorlage zurücknehmen“ setzt du die Variante wieder auf intern freigegeben.')}
        />
      )}
    </IntentWizardShell>
  );
}
