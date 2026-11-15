/**
 * Angebotsvorhaben anlegen — 4-Schritt-Wizard.
 * Steps: 1) Anfrage erfassen → 2) Projektleitung wählen → 3) Erste Prüfaufgabe planen → 4) Prüfen & anlegen.
 * Reads: beteiligte. Writes: angebotsvorhaben, aufgaben (via useVorhabenAnlegenFlow).
 * Composes: IntentWizardShell, Bound, EntitySelectStep, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup, todayIso } from '@/lib/journey';
import type { JourneyRecord } from '@/lib/journey';
import { useVorhabenAnlegenFlow } from '@/lib/journey/flows/VorhabenAnlegen';
import { tx } from '@/i18n';

const personItem = (r: JourneyRecord) => ({
  id: r.id,
  title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
  subtitle: fieldLookup(r, 'fachbereich')?.label,
});

export default function VorhabenAnlegenPage() {
  const [step, setStep] = useState(1);
  const flow = useVorhabenAnlegenFlow({
    steps: {
      bezeichnung: 1, kundenname: 1, anfragenummer: 1, eingangsdatum: 1, abgabefrist: 1,
      anfragebeschreibung: 1, auftragsvolumen: 1, prioritaet: 1,
      projektleitung: 2,
      titel: 3, verantwortlicher: 3, faelligkeit: 3, fragestellung: 3,
    },
    items: { projektleitung: personItem, verantwortlicher: personItem },
    initial: { eingangsdatum: todayIso() },
  });

  return (
    <IntentWizardShell
      title={tx('Angebotsvorhaben anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Eine neue Kundenanfrage erfassen und die erste Prüfaufgabe planen.'),
        needs: [tx('Kunde und Bezeichnung'), tx('Projektleitung'), tx('Verantwortliche Person für die Prüfung')],
      }}
    >
      <WizardStep label={tx('Anfrage')} description={tx('Wer fragt was an, und bis wann muss das Angebot raus?')}>
        <div className="space-y-4">
          <Bound form={flow.forms.angebotsvorhaben} name="bezeichnung" />
          <Bound form={flow.forms.angebotsvorhaben} name="kundenname" />
          <Bound form={flow.forms.angebotsvorhaben} name="anfragenummer" />
          <Bound form={flow.forms.angebotsvorhaben} name="eingangsdatum" />
          <Bound form={flow.forms.angebotsvorhaben} name="abgabefrist" />
          <Bound form={flow.forms.angebotsvorhaben} name="anfragebeschreibung" rows={3} />
          <Bound form={flow.forms.angebotsvorhaben} name="auftragsvolumen" />
          <Bound form={flow.forms.angebotsvorhaben} name="prioritaet" allowClear />
          <StepNav onNext={() => flow.validateStep(1)} nextStepLabel={tx('Projektleitung')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Projektleitung')} description={tx('Wer leitet dieses Vorhaben? Zur Wahl stehen die aktiven Beteiligten.')}>
        <EntitySelectStep
          {...flow.picks.projektleitung.select}
          {...flow.pick('projektleitung')}
          searchPlaceholder={tx('Name suchen …')}
          emptyText={tx('Kein aktiver Beteiligter gefunden.')}
        />
      </WizardStep>

      <WizardStep label={tx('Prüfaufgabe')} description={tx('Die erste Aufgabe entscheidet, ob die Anfrage weiterverfolgt wird.')}>
        <div className="space-y-4">
          <Bound form={flow.forms.aufgaben} name="titel" />
          <Bound form={flow.forms.aufgaben} name="fragestellung" rows={3} />
          <Bound form={flow.forms.aufgaben} name="faelligkeit" />
          <EntitySelectStep
            {...flow.picks.verantwortlicher.select}
            {...flow.pick('verantwortlicher')}
            searchPlaceholder={tx('Name suchen …')}
            emptyText={tx('Kein aktiver Beteiligter gefunden.')}
          />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => flow.validateStep(3)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              ...(flow.forms.angebotsvorhaben.get('abgabefrist') ? [] : [{ key: 'abgabefrist', label: tx('Abgabefrist'), value: tx('Noch keine Frist angegeben'), step: 1 }]),
              { key: 'vorhaben', label: tx('Angebotsvorhaben der Aufgabe'), value: flow.forms.angebotsvorhaben.get('bezeichnung') ? String(flow.forms.angebotsvorhaben.get('bezeichnung')) : tx('Das neu angelegte Vorhaben') },
              { key: 'phase', label: tx('Phase des Vorhabens'), value: tx('Anfrageprüfung') },
              { key: 'art', label: tx('Art der ersten Aufgabe'), value: tx('Prüfentscheidung') },
              { key: 'status', label: tx('Status der Aufgabe'), value: tx('Aktiv') },
            ]}
            whatHappensNext={tx('Das Vorhaben startet in der Anfrageprüfung, die Prüfaufgabe ist sofort aktiv.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Bearbeite als Nächstes die Prüfaufgabe und halte das Ergebnis fest.')}
          next={[
            { label: tx('Aufgabe bearbeiten'), href: '#/intents/aufgabe-bearbeiten' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
