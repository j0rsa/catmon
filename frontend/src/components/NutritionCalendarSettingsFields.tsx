import type { NutritionCalendarSettings } from '../api/userSettings';
import type { CalendarHintKind } from '../lib/nutritionMetrics';
import { WidgetSettingsCheckbox, WidgetSettingsField, WidgetSettingsRadioGroup } from './WidgetSettingsGear';

interface NutritionCalendarSettingsFieldsProps {
  settings: NutritionCalendarSettings;
  onChange: (patch: Partial<NutritionCalendarSettings>) => void;
}

const METRIC_TOGGLES: Array<{
  key: keyof NutritionCalendarSettings;
  kind: CalendarHintKind;
  sample: string;
  label: string;
}> = [
  { key: 'show_total_fluid', kind: 'fluid', sample: '~ml', label: 'Total fluid (ml)' },
  { key: 'show_wet_food', kind: 'wet', sample: 'g', label: 'Wet food (g)' },
  { key: 'show_liquids', kind: 'liquids', sample: 'ml', label: 'Liquids (ml)' },
  { key: 'show_water', kind: 'water', sample: 'ml', label: 'Water (ml)' },
  { key: 'show_dry_food', kind: 'dry', sample: 'g', label: 'Dry food (g)' },
];

export function NutritionCalendarSettingsFields({ settings, onChange }: NutritionCalendarSettingsFieldsProps) {
  return (
    <div className="widget-settings-form">
      <p className="widget-settings-title">Calendar display</p>

      <WidgetSettingsField label="Week starts on">
        <WidgetSettingsRadioGroup
          name="calendar_week_start"
          value={settings.week_start}
          options={[
            { value: 'sunday', label: 'Sunday' },
            { value: 'monday', label: 'Monday' },
          ]}
          onChange={(week_start) => onChange({ week_start })}
        />
      </WidgetSettingsField>

      <WidgetSettingsField label="Day cell metrics">
        <p className="widget-settings-hint muted-text">Colors match the numbers in each day cell.</p>
        <div className="widget-settings-checkbox-list">
          {METRIC_TOGGLES.map((metric) => (
            <WidgetSettingsCheckbox
              key={metric.key}
              className="calendar-legend-row"
              label={metric.label}
              checked={Boolean(settings[metric.key])}
              onChange={(value) => onChange({ [metric.key]: value } as Partial<NutritionCalendarSettings>)}
            >
              <span className={`calendar-hint calendar-hint--${metric.kind} calendar-legend-sample`} aria-hidden="true">
                {metric.sample}
              </span>
              <span className={`calendar-legend-label calendar-hint--${metric.kind}`}>{metric.label}</span>
            </WidgetSettingsCheckbox>
          ))}
          <WidgetSettingsCheckbox
            label="Record count (fallback)"
            checked={settings.show_record_count}
            onChange={(show_record_count) => onChange({ show_record_count })}
          />
        </div>
      </WidgetSettingsField>
    </div>
  );
}
