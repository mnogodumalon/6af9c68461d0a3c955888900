/**
 * Aufgabe bearbeiten — Wizard mit optionaler Folgeaufgabe.
 * Steps: 1) Offene Aufgabe wählen → 2) Ergebnis eintragen & Status setzen → 3) Folgeaufgabe nötig? (mit Hinweis)
 *        → 4–6) Folgeaufgabe anlegen: auslösende Aufgabe, Verantwortlicher, Vorhaben + Titel/Art/Fälligkeit (nur wenn nötig) → Prüfen & speichern.
 * Reads: aufgaben, angebotsvorhaben, beteiligte. Writes: aufgaben (Update der gewählten Aufgabe + Folgeaufgaben als neue Einträge).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, ListEntries, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { addDays, format } from 'date-fns';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { ListEntries } from '@/components/blocks/ListEntries';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup } from '@/lib/journey';
import { useAufgabeBearbeitenFlow } from '@/lib/journey/flows/AufgabeBearbeiten';
import { tx } from '@/i18n';

export default function AufgabeBearbeitenPage() {
  const [step, setStep] = useState(1);
  const flow = useAufgabeBearbeitenFlow({
    steps: {
      aufgaben: 1,
      ergebnis: 2, status: 2,
      folgeaufgabe_noetig: 3, folgeaufgabe_hinweis: 3,
      ausloesende_aufgabe: 4, verantwortlicher: 5,
      vorhaben: 6, titel: 6, art: 6, faelligkeit: 6, fragestellung: 6,
    },
    items: {
      aufgaben: (r, ctx) => ({
        id: r.id,
        title: fieldText(r, 'titel'),
        subtitle: ctx.ref('vorhaben'),
        status: fieldLookup(r, 'status') ?? undefined,
      }),
      vorhaben: r => ({
        id: r.id,
        title: fieldText(r, 'bezeichnung'),
        subtitle: fieldText(r, 'kundenname'),
        status: fieldLookup(r, 'phase') ?? undefined,
      }),
      verantwortlicher: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        subtitle: fieldLookup(r, 'fachbereich')?.label,
      }),
      ausloesende_aufgabe: (r, ctx) => ({
        id: r.id,
        title: fieldText(r, 'titel'),
        subtitle: ctx.ref('vorhaben'),
        status: fieldLookup(r, 'status') ?? undefined,
      }),
    },
    // a follow-up task is due in a week unless the person says otherwise
    initial: { faelligkeit: format(addDays(new Date(), 7), 'yyyy-MM-dd') },
    where: {
      aufgaben: r => !['erledigt', 'entfallen'].includes(fieldLookup(r, 'status')?.key ?? ''),
      vorhaben: r => !['angebot_abgegeben', 'abgebrochen'].includes(fieldLookup(r, 'phase')?.key ?? ''),
    },
  });

  const followUpNeeded = flow.forms.aufgaben.get('folgeaufgabe_noetig') === true;
  // a started follow-up task must be complete, even when the box was not ticked
  const followUpStarted = followUpNeeded || flow.lists.aufgaben2.count > 0 || Boolean(flow.forms.aufgaben2.get('titel'));

  const skipHint = tx('Nur nötig, wenn du bei Schritt 3 eine Folgeaufgabe angegeben hast — sonst gehe direkt weiter.');

  return (
    <IntentWizardShell
      title={tx('Aufgabe bearbeiten')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Halte das Ergebnis einer Aufgabe fest und lege bei Bedarf gleich eine Folgeaufgabe an.'),
        needs: [tx('Die Aufgabe, die du bearbeitest'), tx('Antwort oder Ergebnis'), tx('Wer die Folgeaufgabe übernimmt')],
      }}
    >
      <WizardStep label={tx('Aufgabe')} description={tx('Wähle die offene Aufgabe, zu der du etwas festhalten willst.')}>
        <EntitySelectStep
          {...flow.picks.aufgaben.select}
          {...flow.pick('aufgaben')}
          searchPlaceholder={tx('Titel der Aufgabe …')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Ergebnis')}
        description={tx('Trage die Antwort oder das Ergebnis ein und setze den Status.')}
        needs={['aufgaben']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.aufgaben} name="ergebnis" rows={5} />
          <Bound form={flow.forms.aufgaben} name="status" />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Folgeaufgabe')}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Folgeaufgabe?')}
        description={tx('Gib an, ob aus dem Ergebnis eine weitere Aufgabe entsteht.')}
        needs={['aufgaben']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.aufgaben} name="folgeaufgabe_noetig" />
          {followUpNeeded && (
            <Bound
              form={flow.forms.aufgaben}
              name="folgeaufgabe_hinweis"
              rows={4}
              hint={tx('Was soll die Folgeaufgabe klären? Der Text wird als Fragestellung übernommen.')}
            />
          )}
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => flow.validateStep(3)}
            nextStepLabel={followUpNeeded ? tx('Auslösende Aufgabe') : tx('Prüfen')}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Auslösende Aufgabe')}
        description={followUpNeeded ? tx('Welche Aufgabe löst die Folgeaufgabe aus?') : skipHint}
        needs={['aufgaben']}
      >
        <div className="space-y-4">
          <EntitySelectStep
            {...flow.picks.ausloesende_aufgabe.select}
            {...flow.pick('ausloesende_aufgabe')}
            searchPlaceholder={tx('Aufgabe suchen …')}
          />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => (followUpNeeded ? flow.validateStep(4) : true)}
            nextStepLabel={tx('Verantwortlicher')}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Verantwortlicher')}
        description={followUpNeeded ? tx('Wer übernimmt die Folgeaufgabe?') : skipHint}
        needs={['aufgaben']}
      >
        <div className="space-y-4">
          <EntitySelectStep
            {...flow.picks.verantwortlicher.select}
            {...flow.pick('verantwortlicher')}
            avatar="initials"
            searchPlaceholder={tx('Name suchen …')}
          />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => (followUpNeeded ? flow.validateStep(5) : true)}
            nextStepLabel={tx('Details')}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Folgeaufgabe anlegen')}
        description={followUpNeeded ? tx('Wähle das Vorhaben und lege Titel, Art und Fälligkeit fest.') : skipHint}
        needs={['aufgaben']}
      >
        <div className="space-y-6">
          <EntitySelectStep
            {...flow.picks.vorhaben.select}
            {...flow.pick('vorhaben')}
            searchPlaceholder={tx('Vorhaben suchen …')}
          />
          <ListEntries list={flow.lists.aufgaben2}>
            <Bound form={flow.forms.aufgaben2} name="titel" />
            <Bound form={flow.forms.aufgaben2} name="art" />
            <Bound form={flow.forms.aufgaben2} name="faelligkeit" />
            <Bound form={flow.forms.aufgaben2} name="fragestellung" rows={3} />
          </ListEntries>
          <StepNav
            onBack={() => setStep(5)}
            onNext={() => (followUpStarted ? flow.validateStep(6) : true)}
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
            whatHappensNext={tx('Die Aufgabe wird aktualisiert, Folgeaufgaben erscheinen als geplant in der Aufgabenliste.')}
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
            { label: tx('Entscheidung festhalten'), href: '#/intents/entscheidung-festhalten' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
