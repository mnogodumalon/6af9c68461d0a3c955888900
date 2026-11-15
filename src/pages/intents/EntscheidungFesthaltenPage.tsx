/**
 * Entscheidung festhalten — 6-Schritt-Wizard.
 * Steps: 1) Vorhaben wählen → 2) Aufgabe (optional) → 3) Entscheider wählen → 4) Frage, Ergebnis, Begründung, Auswirkung & Freigabe
 *        → 5) Phase des Vorhabens setzen → 6) Prüfen & festhalten.
 * Reads: angebotsvorhaben, aufgaben, beteiligte. Writes: entscheidungen (create), angebotsvorhaben (nur phase, update).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep (Hook: useEntscheidungFesthaltenFlow).
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup, fieldNumber, fieldRef, formatFieldValue } from '@/lib/journey';
import { useEntscheidungFesthaltenFlow } from '@/lib/journey/flows/EntscheidungFesthalten';
import { tx } from '@/i18n';

export default function EntscheidungFesthaltenPage() {
  const [step, setStep] = useState(1);
  const [vorhabenId, setVorhabenId] = useState<string | null>(null);

  const flow = useEntscheidungFesthaltenFlow({
    steps: {
      vorhaben: 1, aufgabe: 2, entscheider: 3,
      frage: 4, ergebnis: 4, begruendung: 4, bedingungen: 4, finanzielle_auswirkung: 4,
      freigabe_noetig: 4, angebotsvorhaben: 5, phase: 5,
    },
    items: {
      vorhaben: r => ({
        id: r.id,
        title: fieldText(r, 'bezeichnung'),
        subtitle: [fieldText(r, 'kundenname'), fieldLookup(r, 'phase')?.label].filter(Boolean).join(' · '),
      }),
      angebotsvorhaben: r => ({
        id: r.id,
        title: fieldText(r, 'bezeichnung'),
        subtitle: [fieldText(r, 'kundenname'), fieldLookup(r, 'phase')?.label].filter(Boolean).join(' · '),
      }),
      aufgabe: r => ({
        id: r.id,
        title: fieldText(r, 'titel'),
        subtitle: [fieldLookup(r, 'art')?.label, fieldLookup(r, 'status')?.label].filter(Boolean).join(' · '),
      }),
      entscheider: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        subtitle: fieldNumber(r, 'entscheidungsgrenze') != null
          ? tx`Entscheidungsgrenze ${formatFieldValue('beteiligte', 'entscheidungsgrenze', fieldNumber(r, 'entscheidungsgrenze'))}`
          : undefined,
      }),
    },
    where: {
      aufgabe: r => !vorhabenId || fieldRef(r, 'vorhaben') === vorhabenId,
    },
  });

  const entscheidung = flow.forms.entscheidungen;
  const vorhabenPick = flow.pick('vorhaben');
  const phasePick = flow.pick('angebotsvorhaben');

  // Entscheidungsgrenze des gewählten Entscheiders gegen die finanzielle Auswirkung
  const entscheiderId = entscheidung.get('entscheider') as string | undefined;
  const grenze = entscheiderId ? fieldNumber(flow.picks.entscheider.recordOf(entscheiderId) ?? { id: '', fields: {}, createdAt: null }, 'entscheidungsgrenze') : null;
  const auswirkungRaw = entscheidung.get('finanzielle_auswirkung');
  const auswirkung = auswirkungRaw === '' || auswirkungRaw == null ? null : Number(auswirkungRaw);
  const ueberGrenze = grenze != null && auswirkung != null && !Number.isNaN(auswirkung) && Math.abs(auswirkung) > grenze;

  return (
    <IntentWizardShell
      title={tx('Entscheidung festhalten')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Eine Entscheidung zu einem Vorhaben festhalten und die Phase weiterführen.'),
        needs: [tx('Vorhaben'), tx('Entscheider'), tx('Entscheidungsfrage und Ergebnis')],
      }}
    >
      <WizardStep label={tx('Vorhaben')} description={tx('Zu welchem Vorhaben gehört die Entscheidung?')}>
        <EntitySelectStep
          {...flow.picks.vorhaben.select}
          {...vorhabenPick}
          onSelect={id => {
            vorhabenPick.onSelect(id);
            phasePick.onSelect(id);
            setVorhabenId(id);
          }}
          searchPlaceholder={tx('Bezeichnung oder Kunde …')}
        />
      </WizardStep>

      <WizardStep label={tx('Aufgabe')} description={tx('Optional: Welche Aufgabe hat zu dieser Entscheidung geführt?')} needs={['vorhaben']}>
        <div className="space-y-4">
          <EntitySelectStep
            {...flow.picks.aufgabe.select}
            {...flow.pick('aufgabe')}
            searchPlaceholder={tx('Aufgabentitel …')}
          />
          <StepNav onBack={() => setStep(1)} onNext={() => flow.validateStep(2)} nextStepLabel={tx('Entscheider')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Entscheider')} description={tx('Wer hat die Entscheidung getroffen?')} needs={['vorhaben']}>
        <EntitySelectStep
          {...flow.picks.entscheider.select}
          {...flow.pick('entscheider')}
          avatar="initials"
          searchPlaceholder={tx('Name …')}
        />
      </WizardStep>

      <WizardStep label={tx('Entscheidung')} description={tx('Frage, Ergebnis, Begründung und Auswirkung festhalten; Freigabe markieren, wenn nötig.')}>
        <div className="space-y-4">
          <Bound form={entscheidung} name="frage" />
          <Bound form={entscheidung} name="ergebnis" />
          <Bound form={entscheidung} name="begruendung" rows={3} />
          <Bound form={entscheidung} name="bedingungen" rows={3} />
          <Bound form={entscheidung} name="finanzielle_auswirkung" />
          {grenze != null && auswirkung != null && (
            <div
              className={
                ueberGrenze
                  ? 'rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm'
                  : 'rounded-2xl border bg-secondary p-4 text-sm'
              }
            >
              {ueberGrenze
                ? tx`Die finanzielle Auswirkung (${formatFieldValue('entscheidungen', 'finanzielle_auswirkung', auswirkung)}) liegt über der Entscheidungsgrenze des Entscheiders (${formatFieldValue('beteiligte', 'entscheidungsgrenze', grenze)}) — markiere die Freigabe.`
                : tx`Die finanzielle Auswirkung liegt innerhalb der Entscheidungsgrenze des Entscheiders (${formatFieldValue('beteiligte', 'entscheidungsgrenze', grenze)}).`}
            </div>
          )}
          <Bound form={entscheidung} name="freigabe_noetig" />
          <StepNav onBack={() => setStep(3)} onNext={() => flow.validateStep(4)} nextStepLabel={tx('Phase')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Phase')} description={tx('In welcher Phase steht das Vorhaben nach dieser Entscheidung?')}>
        <div className="space-y-4">
          {phasePick.selectedId ? (
            <Bound form={flow.forms.angebotsvorhaben} name="phase" />
          ) : (
            <EntitySelectStep
              {...flow.picks.angebotsvorhaben.select}
              {...phasePick}
              searchPlaceholder={tx('Bezeichnung oder Kunde …')}
            />
          )}
          <StepNav onBack={() => setStep(4)} onNext={() => flow.validateStep(5)} nextStepLabel={tx('Prüfen')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[{ key: 'entscheidungsdatum', label: tx('Entscheidungsdatum'), value: tx('Heute') }]}
            whatHappensNext={tx('Die Entscheidung wird gespeichert und die Phase des Vorhabens aktualisiert.')}
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
        />
      )}
    </IntentWizardShell>
  );
}
