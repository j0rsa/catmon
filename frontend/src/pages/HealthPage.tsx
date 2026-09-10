import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { weightApi } from '../api/weight';
import { medicationsApi } from '../api/medications';
import { parseDecimal } from '../lib/numbers';
import type { CreateWeightRecord, WeightGranularity } from '../api/weight';
import { NoPetSelected } from '../components/NoPetSelected';
import { HealthStatePanel } from '../components/health/HealthStatePanel';
import { MedIntakePanel } from '../components/health/MedIntakePanel';
import { WeightHistoryChart } from '../components/health/WeightHistoryChart';
import { WeightRecordList } from '../components/health/WeightRecordList';
import { WeightRecordTagFilter } from '../components/health/WeightRecordTagFilter';
import { useSelectedPet } from '../context/SelectedPetContext';
import { localToday, shiftDate } from '../lib/dates';
import { usePermissions } from '../context/usePermissions';
import { useFormatDate, useFormatTime } from '../context/useDisplaySettings';
import { useScrollToHash } from '../hooks/useScrollToHash';
import { hasActiveAssignmentOn } from '../lib/medications';
import { weightNoteHasAnyTag } from '../lib/weightNote';

type PeriodLabel = '30d' | '90d' | '1y' | 'all';

const WEIGHT_PERIODS: { label: PeriodLabel; days: number | null; granularity: WeightGranularity }[] = [
  { label: '30d', days: 30,  granularity: 'daily'  },
  { label: '90d', days: 90,  granularity: 'daily'  },
  { label: '1y',  days: 365, granularity: 'weekly' },
  { label: 'all', days: null, granularity: 'weekly' },
];

function nowLocalDateTimeString(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export default function HealthPage() {
  const { selectedPetId, selectedPet, petsLoading } = useSelectedPet();
  const queryClient = useQueryClient();
  const { canWrite } = usePermissions();
  const formatDate = useFormatDate();
  const formatTime = useFormatTime();

  const [period, setPeriod] = useState<PeriodLabel>('30d');
  const [tagFilter, setTagFilter] = useState<{ petId: string | null; excluded: string[] }>({
    petId: null,
    excluded: [],
  });
  const excludedTags = tagFilter.petId === selectedPetId ? tagFilter.excluded : [];
  const today = localToday();
  const { days: periodDays, granularity } = WEIGHT_PERIODS.find((p) => p.label === period)!;
  const dateFrom = periodDays != null ? shiftDate(today, -(periodDays - 1)) : undefined;
  const excludeKey = [...excludedTags].sort((a, b) => a.localeCompare(b)).join(',');

  const summaryQuery = useQuery({
    queryKey: ['weight-summary', dateFrom ?? 'all', today, granularity, 'tag', selectedPetId],
    queryFn: () => weightApi.summary({
      pet_id: selectedPetId!,
      date_from: dateFrom,
      date_to: today,
      granularity,
      group_by: 'tag',
    }),
    enabled: Boolean(selectedPetId),
    placeholderData: keepPreviousData,
  });

  const latestQuery = useQuery({
    queryKey: ['weight-records', selectedPetId, ''],
    queryFn: () => weightApi.list({ pet_id: selectedPetId!, limit: 10 }),
    enabled: Boolean(selectedPetId),
  });

  const weightsQuery = useQuery({
    queryKey: ['weight-records', selectedPetId, excludeKey],
    queryFn: () => weightApi.list({
      pet_id: selectedPetId!,
      limit: 10,
      exclude_tags: excludedTags.length > 0 ? excludedTags : undefined,
    }),
    enabled: Boolean(selectedPetId),
  });

  const tagsQuery = useQuery({
    queryKey: ['weight-tags', selectedPetId],
    queryFn: () => weightApi.tags(selectedPetId!),
    enabled: Boolean(selectedPetId),
  });

  const assignmentsQuery = useQuery({
    queryKey: ['med-assignments', selectedPetId],
    queryFn: () => medicationsApi.listAssignments({ pet_id: selectedPetId! }),
    enabled: Boolean(selectedPetId),
  });

  const [weightInput, setWeightInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [measuredAt, setMeasuredAt] = useState(() => nowLocalDateTimeString());

  function invalidateWeightQueries() {
    queryClient.invalidateQueries({ queryKey: ['weight-records', selectedPetId] });
    queryClient.invalidateQueries({ queryKey: ['weight-tags', selectedPetId] });
    queryClient.invalidateQueries({ queryKey: ['weight-summary'] });
    queryClient.invalidateQueries({ queryKey: ['pets', selectedPetId] });
    queryClient.invalidateQueries({ queryKey: ['pets'] });
  }

  const addMutation = useMutation({
    mutationFn: (payload: CreateWeightRecord) => weightApi.create(payload),
    onSuccess: () => {
      setWeightInput('');
      setNoteInput('');
      setMeasuredAt(nowLocalDateTimeString());
      invalidateWeightQueries();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => weightApi.update(id, { note }),
    onSuccess: invalidateWeightQueries,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => weightApi.delete(id),
    onSuccess: invalidateWeightQueries,
  });

  useScrollToHash(summaryQuery.isPending);

  if (petsLoading) return <div className="loading-state">Loading…</div>;
  if (!selectedPetId) return <NoPetSelected />;

  const fetched = Array.isArray(weightsQuery.data) ? weightsQuery.data : (latestQuery.data ?? []);
  const records = fetched
    .filter((r) => r.local_date && r.weight_kg != null)
    .filter((r) => excludedTags.length === 0 || !weightNoteHasAnyTag(r.note, excludedTags));
  const latest = (latestQuery.data ?? []).find((r) => r.local_date && r.weight_kg != null);
  const tagOptions = tagsQuery.data ?? [];
  const showRecentRecords = (latestQuery.data ?? []).length > 0 || excludedTags.length > 0;
  const hasActiveTreatmentPlan = hasActiveAssignmentOn(assignmentsQuery.data ?? [], today);

  function formatRecordWhen(measuredAt: string, localDate: string): string {
    return `${formatDate(localDate, 'short')} ${formatTime(measuredAt)}`;
  }

  function handleAdd() {
    const kg = parseDecimal(weightInput);
    if (isNaN(kg) || kg <= 0 || !selectedPetId) return;
    addMutation.mutate({
      pet_id: selectedPetId,
      weight_kg: kg,
      note: noteInput.trim() || undefined,
      measured_at: measuredAt ? measuredAt + ':00' : undefined,
    });
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Health</p>
          <h2>{selectedPet?.name ?? 'Pet'}</h2>
        </div>
        {latest && (
          <span style={{ fontFamily: 'monospace', fontSize: '1.6rem', color: 'var(--accent)' }}>
            {latest.weight_kg} kg
          </span>
        )}
      </section>

      {hasActiveTreatmentPlan && <MedIntakePanel petId={selectedPetId} />}

      <HealthStatePanel petId={selectedPetId} />

      <section className="panel" id="weight">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Weight</p>
            <h3>History</h3>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {WEIGHT_PERIODS.map((p) => (
            <button
              key={p.label}
              type="button"
              className={`button${period === p.label ? '' : ' button-secondary'}`}
              style={{ padding: '0.3rem 0.8rem', fontSize: '0.82rem' }}
              onClick={() => setPeriod(p.label)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {summaryQuery.isPending ? (
          <div className="loading-state" style={{ minHeight: 200 }}>Loading…</div>
        ) : (
          <WeightHistoryChart
            buckets={summaryQuery.data ?? []}
            granularity={granularity}
            isFetching={summaryQuery.isFetching}
          />
        )}

        {canWrite && <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-row" style={{ flex: '0 0 auto' }}>
            <label style={{ fontSize: '0.82rem' }}>Date &amp; time</label>
            <input
              type="datetime-local"
              value={measuredAt}
              onChange={(e) => setMeasuredAt(e.target.value)}
              style={{ width: '13rem' }}
            />
          </div>
          <div className="form-row" style={{ flex: '0 0 auto' }}>
            <label style={{ fontSize: '0.82rem' }}>Weight (kg)</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="e.g. 4.35"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              style={{ width: '9rem' }}
            />
          </div>
          <div className="form-row" style={{ flex: '1 1 140px' }}>
            <label style={{ fontSize: '0.82rem' }}>Note (optional)</label>
            <input
              type="text"
              placeholder="#Petkit after meal"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <button
            className="button"
            type="button"
            disabled={addMutation.isPending || !weightInput}
            onClick={handleAdd}
            style={{ alignSelf: 'flex-end' }}
          >
            {addMutation.isPending ? 'Saving…' : 'Log weight'}
          </button>
        </div>}
      </section>

      {showRecentRecords && (
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Measurements</p>
              <h3>Recent records</h3>
            </div>
            <div className="weight-record-heading-actions">
              <span className="muted-text" style={{ fontSize: '0.82rem' }}>
                Last {records.length}
              </span>
              <WeightRecordTagFilter
                tags={tagOptions}
                excluded={excludedTags}
                onChange={(excluded) => setTagFilter({ petId: selectedPetId, excluded })}
              />
            </div>
          </div>
          {records.length > 0 ? (
            <WeightRecordList
              records={records}
              canWrite={canWrite}
              formatWhen={(record) => formatRecordWhen(record.measured_at, record.local_date)}
              updatingId={updateMutation.isPending ? updateMutation.variables?.id : undefined}
              deletingId={deleteMutation.isPending ? deleteMutation.variables : undefined}
              onUpdateNote={(id, note) => updateMutation.mutate({ id, note })}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ) : (
            <p className="muted-text">No records match this filter.</p>
          )}
        </section>
      )}
    </div>
  );
}
