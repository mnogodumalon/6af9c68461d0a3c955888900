import { useMemo, useState } from 'react';
import { format, addDays, differenceInCalendarDays, parseISO } from 'date-fns';
import { IconAlertTriangle, IconPlus, IconListCheck, IconCalendarDue, IconGavel, IconChecklist, IconFileText, IconLink, IconArrowsExchange } from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { flowActionFor, countOf } from '@/config/plan';
import type { EnrichedAngebotsvorhaben, EnrichedAufgaben } from '@/types/enriched';
import { LOOKUP_OPTIONS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import { formatDate, lookupKey } from '@/lib/formatters';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { tx, appLabel } from '@/i18n';
import { Button } from '@/components/ui/button';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { KanbanWidget, type KanbanCard, type KanbanColumn, type KanbanTone } from '@/components/widgets/KanbanWidget';

// Layout: Hub-and-spoke (Angebotsvorhaben = Hub). Primary = Kanban je Phase (wide),
// Hero = überfällige Aufgaben (nur dort), Aside = offene Aufgaben + Entscheidungen mit Freigabe/vertagt.
const OPEN_TASK = ['geplant', 'aktiv', 'wartet'];
const CLOSED_PHASES = ['angebot_abgegeben', 'abgebrochen'];
const PRIO_RANK: Record<string, number> = { hoch: 0, normal: 1, niedrig: 2 };

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const { angebotsvarianten } = data;
  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'aufgaben') {
        const go = flowActionFor('aufgaben', 'status', top.record.record_id, 'erledigt');
        const st = lookupKey(top.record.fields.status);
        return go && st && OPEN_TASK.includes(st) ? { label: tx('Aufgabe abschließen'), onClick: go } : undefined;
      }
      if (top.type === 'angebotsvorhaben') {
        const next = nextPhase(lookupKey(top.record.fields.phase));
        if (!next) return undefined;
        const go = flowActionFor('angebotsvorhaben', 'phase', top.record.record_id, next);
        return go ? { label: tx('Nächste Phase festhalten'), onClick: go } : undefined;
      }
      return undefined;
    },
  });
  const vorhaben = crud.enriched.angebotsvorhaben;
  const aufgaben = crud.enriched.aufgaben;
  const entscheidungen = crud.enriched.entscheidungen;

  const clock = useClock();
  const todayKey = format(clock, 'yyyy-MM-dd');
  const soonKey = format(addDays(clock, 14), 'yyyy-MM-dd');

  const [fristOnly, setFristOnly] = useState(false);
  const [folgeOnly, setFolgeOnly] = useState(false);

  const phaseColumns = useMemo<KanbanColumn[]>(
    () => (LOOKUP_OPTIONS['angebotsvorhaben']?.['phase'] ?? []).map(o => ({ key: o.key, label: o.label })),
    [],
  );

  const day = (s?: string) => (s ? s.slice(0, 10) : '');
  const isOpenTask = (a: EnrichedAufgaben) => OPEN_TASK.includes(lookupKey(a.fields.status) ?? '');
  const overdue = useMemo(
    () => aufgaben.filter(a => isOpenTask(a) && day(a.fields.faelligkeit) && day(a.fields.faelligkeit) < todayKey)
      .sort((a, b) => day(a.fields.faelligkeit).localeCompare(day(b.fields.faelligkeit))),
    [aufgaben, todayKey],
  );
  const openTasks = useMemo(
    () => aufgaben.filter(isOpenTask).sort((a, b) => (day(a.fields.faelligkeit) || '9999').localeCompare(day(b.fields.faelligkeit) || '9999')),
    [aufgaben],
  );
  const folgeTasks = useMemo(
    () => openTasks.filter(a => a.fields.folgeaufgabe_noetig),
    [openTasks],
  );
  const decisionsOpen = useMemo(
    () => entscheidungen.filter(e => e.fields.freigabe_noetig || lookupKey(e.fields.ergebnis) === 'vertagt'),
    [entscheidungen],
  );
  const activeVorhaben = vorhaben.filter(v => !CLOSED_PHASES.includes(lookupKey(v.fields.phase) ?? ''));
  const fristSoon = activeVorhaben.filter(v => day(v.fields.abgabefrist) && day(v.fields.abgabefrist) <= soonKey);

  const cards = useMemo<KanbanCard[]>(() => {
    const list = fristOnly ? fristSoon : vorhaben;
    return [...list]
      .sort((a, b) => (PRIO_RANK[lookupKey(a.fields.prioritaet) ?? 'normal'] ?? 1) - (PRIO_RANK[lookupKey(b.fields.prioritaet) ?? 'normal'] ?? 1)
        || (day(a.fields.abgabefrist) || '9999').localeCompare(day(b.fields.abgabefrist) || '9999'))
      .map((v: EnrichedAngebotsvorhaben) => {
        const nTasks = aufgaben.filter(a => extractRecordId(a.fields.vorhaben) === v.record_id && isOpenTask(a)).length;
        const nVar = angebotsvarianten.filter(x => extractRecordId(x.fields.vorhaben) === v.record_id).length;
        const nDec = entscheidungen.filter(e => extractRecordId(e.fields.vorhaben) === v.record_id).length;
        const prio = lookupKey(v.fields.prioritaet);
        const fr = day(v.fields.abgabefrist);
        const closed = CLOSED_PHASES.includes(lookupKey(v.fields.phase) ?? '');
        const tone: KanbanTone = closed ? 'default' : prio === 'hoch' ? 'primary' : fr && fr <= soonKey ? 'warning' : 'default';
        return {
          id: `vorhaben:${v.record_id}`,
          column: lookupKey(v.fields.phase) ?? phaseColumns[0]?.key ?? '',
          title: v.fields.bezeichnung ?? v.fields.kundenname ?? tx('Ohne Bezeichnung'),
          subtitle: (
            <span className="block space-y-0.5">
              <span className="block truncate">
                {[v.fields.kundenname, v.projektleitungName].filter(Boolean).join(' · ')}
              </span>
              <span className="block truncate">
                {prio === 'hoch' ? <b>{tx('Hohe Priorität')} · </b> : null}
                {fr ? tx`Frist ${formatDate(fr)}` : tx('Ohne Frist')}
              </span>
              <span className="block truncate">
                {countOf('aufgaben', nTasks, appLabel('aufgaben'))} · {countOf('angebotsvarianten', nVar, appLabel('angebotsvarianten'))} · {countOf('entscheidungen', nDec, appLabel('entscheidungen'))}
              </span>
            </span>
          ),
          tone,
        };
      });
  }, [vorhaben, fristOnly, fristSoon, aufgaben, angebotsvarianten, entscheidungen, phaseColumns, soonKey]);

  const openVorhaben = (id: string) => {
    const r = data.angebotsvorhaben.find(x => x.record_id === id);
    if (r) crud.angebotsvorhaben.openDetail(r);
  };

  // Phase gehört einem Ablauf — Drag öffnet ihn statt zu schreiben.
  const moveCard = (cardId: string, newColumn: string) => {
    const id = cardId.split(':')[1];
    if (!id) return;
    const go = flowActionFor('angebotsvorhaben', 'phase', id, newColumn);
    if (go) { go(); undoToast(tx('Ablauf für den Phasenwechsel geöffnet')); return tx('Phasenwechsel im Ablauf bestätigen'); }
    return tx('Phasenwechsel ist nur über den Ablauf möglich — öffne das Vorhaben.');
  };

  const taskAction = (a: EnrichedAufgaben) => {
    const go = flowActionFor('aufgaben', 'status', a.record_id, 'erledigt');
    return go ? { label: tx('✓ Abschließen'), onClick: go } : { label: tx('Bearbeiten'), onClick: () => crud.aufgaben.openEdit(data.aufgaben.find(x => x.record_id === a.record_id) ?? a) };
  };

  const openAufgabe = (id: string) => {
    const r = data.aufgaben.find(x => x.record_id === id);
    if (r) crud.aufgaben.openDetail(r);
  };

  const taskSecond = (a: EnrichedAufgaben) => {
    const f = day(a.fields.faelligkeit);
    const st = a.fields.status?.label;
    return (
      <span className="text-muted-foreground">
        {a.vorhabenName ? `${a.vorhabenName} · ` : ''}{a.verantwortlicherName ? `${a.verantwortlicherName} · ` : ''}
        {f ? tx`fällig ${formatDate(f)}` : tx('ohne Fälligkeit')} · <span className="font-medium text-foreground">{st}</span>
      </span>
    );
  };

  // Hero: überfällige Aufgaben (einziger Ort dieses Signals)
  const worst = overdue[0];
  const daysLate = worst ? differenceInCalendarDays(clock, parseISO(day(worst.fields.faelligkeit))) : 0;

  const shownTasks = folgeOnly ? folgeTasks : openTasks;

  // Kontextzeile
  const hoch = activeVorhaben.filter(v => lookupKey(v.fields.prioritaet) === 'hoch');
  let context: string;
  if (vorhaben.length === 0) context = tx('Lege dein erstes Angebotsvorhaben an, um den Bearbeitungsplan zu starten.');
  else if (fristSoon.length > 0) {
    const n = namen(fristSoon.map(v => v.fields.bezeichnung ?? v.fields.kundenname ?? ''));
    context = tx`Bald fällig: ${n} — Frist in den nächsten 14 Tagen.`;
  } else if (hoch.length > 0) {
    const n = namen(hoch.map(v => v.fields.bezeichnung ?? v.fields.kundenname ?? ''));
    context = tx`Hohe Priorität: ${n}.`;
  } else if (decisionsOpen.length > 0) {
    const n = namen(decisionsOpen.map(e => e.vorhabenName || e.fields.frage || ''));
    context = tx`Entscheidungen offen bei ${n}.`;
  } else {
    const n = namen(activeVorhaben.map(v => v.fields.bezeichnung ?? v.fields.kundenname ?? ''));
    context = tx`Laufende Vorhaben: ${n || '—'}.`;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{context}</p>
        </div>
        {crud.angebotsvorhaben.canWrite && (
          <Button onClick={() => crud.angebotsvorhaben.openCreate({ phase: 'anfragepruefung', prioritaet: 'normal' })}>
            <IconPlus size={16} className="shrink-0" />
            <span className="ml-1">{tx('Neues Vorhaben')}</span>
          </Button>
        )}
      </div>

      <DashboardGrid
        variant="wide"
        hero={worst ? (
          <HeroBanner
            icon={<IconAlertTriangle size={18} />}
            action={(() => {
              const go = flowActionFor('aufgaben', 'status', worst.record_id, 'erledigt');
              return go ? { label: tx('Aufgabe abschließen'), onClick: go } : { label: tx('Aufgabe öffnen'), onClick: () => openAufgabe(worst.record_id) };
            })()}
          >
            <b>{countOf('aufgaben', overdue.length, appLabel('aufgaben'))}</b> {tx('überfällig')} — {tx`„${worst.fields.titel ?? ''}“`}
            {worst.vorhabenName ? tx` bei ${worst.vorhabenName}` : ''}
            {worst.verantwortlicherName ? tx` (${worst.verantwortlicherName})` : ''}
            {tx` war vor ${daysLate} Tagen fällig.`}
          </HeroBanner>
        ) : undefined}
        kpis={vorhaben.length > 0 ? (
          <StatStrip>
            <StatStripItem
              title={tx('Frist in 14 Tagen')}
              value={fristSoon.length}
              icon={<IconCalendarDue size={16} />}
              tone={fristSoon.length > 0 ? 'warning' : 'default'}
              onClick={() => setFristOnly(f => !f)}
              active={fristOnly}
            />
            <StatStripItem
              title={tx('Folgeaufgabe nötig')}
              value={folgeTasks.length}
              icon={<IconListCheck size={16} />}
              tone={folgeTasks.length > 0 ? 'primary' : 'default'}
              onClick={() => setFolgeOnly(f => !f)}
              active={folgeOnly}
            />
            <StatStripItem
              title={tx('Freigabe / vertagt')}
              value={decisionsOpen.length}
              icon={<IconGavel size={16} />}
              tone={decisionsOpen.length > 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title={appLabel('anforderungen')}
              value={data.anforderungen.length}
              icon={<IconChecklist size={16} />}
            />
            <StatStripItem
              title={appLabel('fachbeitraege')}
              value={data.fachbeitraege.length}
              icon={<IconFileText size={16} />}
            />
            <StatStripItem
              title={appLabel('abhaengigkeiten')}
              value={data.abhaengigkeiten.length}
              icon={<IconLink size={16} />}
            />
            <StatStripItem
              title={appLabel('angebotsuebernahmen')}
              value={data.angebotsuebernahmen.length}
              icon={<IconArrowsExchange size={16} />}
            />
          </StatStrip>
        ) : undefined}
        primary={
          <KanbanWidget
            cards={cards}
            columns={phaseColumns}
            defaultCollapsed={['angebot_abgegeben', 'abgebrochen']}
            onCardClick={c => openVorhaben(c.id.split(':')[1] ?? '')}
            onCardMove={moveCard}
            onAddCard={crud.angebotsvorhaben.canWrite ? (col => crud.angebotsvorhaben.openCreate({ phase: col, prioritaet: 'normal' })) : undefined}
          />
        }
        aside={
          <>
            <WorkList
              title={folgeOnly ? tx('Folgeaufgabe nötig') : tx('Offene Aufgaben')}
              icon={<IconListCheck size={16} />}
              items={shownTasks.map(a => ({
                id: a.record_id,
                title: a.fields.titel ?? tx('Ohne Titel'),
                secondLine: taskSecond(a),
                action: taskAction(a),
              }))}
              onItemClick={openAufgabe}
              empty={{ text: tx('Keine offenen Aufgaben — der Bearbeitungsplan ist abgearbeitet.'), action: crud.aufgaben.canWrite ? { label: tx('Aufgabe planen'), onClick: () => crud.aufgaben.openCreate({ status: 'geplant', ausloeser: 'spontan' }) } : undefined }}
            />
            <WorkList
              title={tx('Entscheidungen mit Freigabe oder vertagt')}
              icon={<IconGavel size={16} />}
              items={decisionsOpen.map(e => ({
                id: e.record_id,
                title: e.fields.frage ?? tx('Ohne Frage'),
                secondLine: (
                  <span className="text-muted-foreground">
                    {e.vorhabenName ? `${e.vorhabenName} · ` : ''}{e.entscheiderName ? `${e.entscheiderName} · ` : ''}
                    <span className="font-medium text-foreground">
                      {lookupKey(e.fields.ergebnis) === 'vertagt' ? tx('Vertagt') : tx('Freigabe nötig')}
                    </span>
                  </span>
                ),
                action: { label: tx('Bearbeiten'), onClick: () => { const r = data.entscheidungen.find(x => x.record_id === e.record_id); if (r) crud.entscheidungen.openEdit(r); } },
              }))}
              onItemClick={id => { const r = data.entscheidungen.find(x => x.record_id === id); if (r) crud.entscheidungen.openDetail(r); }}
              empty={{ text: tx('Keine Entscheidung wartet auf Freigabe.') }}
            />
          </>
        }
      />
      {crud.surfaces}
    </div>
  );
}

function nextPhase(cur?: string): string | undefined {
  const order = (LOOKUP_OPTIONS['angebotsvorhaben']?.['phase'] ?? []).map(o => o.key).filter(k => k !== 'abgebrochen');
  const i = cur ? order.indexOf(cur) : -1;
  return i >= 0 && i < order.length - 1 ? order[i + 1] : undefined;
}
