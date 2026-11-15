/**
 * Variante erfassen — 5-Schritt-Wizard.
 * Steps: 1) Vorhaben wählen → 2) Bezeichnung, Beschreibung, Menge, Teillieferung → 3) Kosten, Aufwand, Preis
 *        → 4) Risiken, Vertragsbedingungen, Liefertermin → 5) Prüfen & anlegen.
 * Reads: angebotsvorhaben. Writes: angebotsvarianten (Status fix „entwurf“, über den Flow-Hook).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup } from '@/lib/journey';
import { useVarianteErfassenFlow } from '@/lib/journey/flows/VarianteErfassen';
import { tx } from '@/i18n';

export default function VarianteErfassenPage() {
  const [step, setStep] = useState(1);
  const flow = useVarianteErfassenFlow({
    steps: {
      vorhaben: 1,
      variantenbezeichnung: 2, beschreibung: 2, menge: 2, teillieferung: 2,
      herstellkosten: 3, beschaffungskosten: 3, aufwand_stunden: 3, angebotspreis: 3,
      akzeptierte_risiken: 4, vertragsbedingungen: 4, liefertermin: 4,
    },
    items: {
      vorhaben: r => ({
        id: r.id,
        title: fieldText(r, 'bezeichnung'),
        subtitle: fieldText(r, 'kundenname'),
        status: fieldLookup(r, 'phase') ?? undefined,
      }),
    },
  });
  const f = flow.forms.angebotsvarianten;

  return (
    <IntentWizardShell
      title={tx('Angebotsvariante erfassen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Eine neue Variante zu einem Vorhaben anlegen, z. B. bei akzeptierter Teillieferung.'),
        needs: [tx('Das Vorhaben'), tx('Mengen und Kosten'), tx('Liefertermin')],
      }}
    >
      <WizardStep label={tx('Vorhaben')} description={tx('Zu welchem Angebotsvorhaben gehört die Variante?')}>
        <EntitySelectStep
          {...flow.picks.vorhaben.select}
          {...flow.pick('vorhaben')}
          searchPlaceholder={tx('Bezeichnung oder Kunde …')}
        />
      </WizardStep>

      <WizardStep label={tx('Grunddaten')} description={tx('Wie heißt die Variante und was umfasst sie?')} needs={['vorhaben']}>
        <div className="space-y-4">
          <Bound form={f} name="variantenbezeichnung" />
          <Bound form={f} name="beschreibung" rows={3} />
          <Bound form={f} name="menge" />
          <Bound form={f} name="teillieferung" />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Kosten')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Kosten')} description={tx('Kosten, Aufwand und Angebotspreis eintragen.')}>
        <div className="space-y-4">
          <Bound form={f} name="herstellkosten" />
          <Bound form={f} name="beschaffungskosten" />
          <Bound form={f} name="aufwand_stunden" />
          <Bound form={f} name="angebotspreis" />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => flow.validateStep(3)}
            nextStepLabel={tx('Risiken & Termin')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Risiken & Termin')} description={tx('Risiken, Vertragsbedingungen und Liefertermin ergänzen.')}>
        <div className="space-y-4">
          <Bound form={f} name="akzeptierte_risiken" rows={3} />
          <Bound form={f} name="vertragsbedingungen" rows={3} />
          <div role="group" data-key="liefertermin" aria-label={tx('Liefertermin')}>
            <Bound form={f} name="liefertermin" />
          </div>
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
            items={[{ key: 'status', label: tx('Status'), value: tx('Entwurf') }]}
            whatHappensNext={tx('Die Variante wird als Entwurf angelegt und kann danach dem Kunden vorgelegt werden.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Variante dem Kunden vorlegen'), href: '#/intents/variante-vorlegen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Zum Vorlegen nutzt du den Ablauf „Variante dem Kunden vorlegen“.')}
        />
      )}
    </IntentWizardShell>
  );
}
