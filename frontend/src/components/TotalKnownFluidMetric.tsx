interface TotalKnownFluidMetricProps {
  totalFluidMl: number;
  scheduledMl: number | null;
}

export function TotalKnownFluidMetric({ totalFluidMl, scheduledMl }: TotalKnownFluidMetricProps) {
  const scheduled = scheduledMl != null ? Math.round(scheduledMl) : null;
  const ahead = scheduled != null && totalFluidMl > scheduled;
  const behind = scheduled != null && totalFluidMl < scheduled;

  return (
    <strong className="metric-total-fluid-value">
      ~{totalFluidMl}
      <span>ml</span>
      {scheduled != null ? (
        <span
          className={[
            'metric-fluid-schedule-hint',
            ahead ? 'metric-fluid-schedule-hint--ahead' : '',
            behind ? 'metric-fluid-schedule-hint--behind' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {ahead ? ' ▲' : null}
          {behind ? ' ▼' : null}
          {' '}
          (scheduled {scheduled})
        </span>
      ) : null}
    </strong>
  );
}
