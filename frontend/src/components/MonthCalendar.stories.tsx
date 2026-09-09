import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, fn, userEvent, within } from 'storybook/test';
import { mockCalendarHighlights, mockNutritionCalendarSettings } from '../stories/fixtures';
import { asNarrowStory } from '../stories/viewport';
import type { DayNutritionHighlight } from '../types/pillars';
import { MonthCalendar } from './MonthCalendar';

function packedMonthHighlights(month = '2024-08'): Map<string, DayNutritionHighlight> {
  const map = new Map<string, DayNutritionHighlight>();
  for (const day of [1, 2, 3, 11, 15]) {
    map.set(`${month}-${String(day).padStart(2, '0')}`, {
      recordCount: 8,
      wetFood: 340 - day * 8,
      water: 425 - day * 5,
      liquids: 12,
      dryFood: 135 - day,
    });
  }
  return map;
}

function assertHintsStayInCells(canvasElement: HTMLElement) {
  const cells = canvasElement.querySelectorAll<HTMLElement>('.calendar-cell.has-data');
  expect(cells.length, 'packed days should render').toBeGreaterThan(0);
  for (const cell of cells) {
    const cellBox = cell.getBoundingClientRect();
    const hints = cell.querySelectorAll<HTMLElement>('.calendar-hint');
    expect(hints.length, 'day cell should show stacked metrics').toBeGreaterThan(1);
    for (const hint of hints) {
      const box = hint.getBoundingClientRect();
      expect(box.right, 'metric text should stay inside the day cell').toBeLessThanOrEqual(cellBox.right + 1);
      expect(hint.textContent, 'compact metrics should not join with middots').not.toContain('·');
    }
  }
}

const meta = {
  title: 'Calendar/MonthCalendar',
  component: MonthCalendar,
  tags: ['autodocs'],
  decorators: [
    (Story) => {
      const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
      client.setQueryData(['user-settings', 'nutrition_calendar'], mockNutritionCalendarSettings);
      return (
        <QueryClientProvider client={client}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
  args: {
    month: '2024-06',
    selectedDate: '2024-06-15',
    highlights: mockCalendarHighlights(),
    onMonthChange: fn(),
    onSelectDate: fn(),
  },
} satisfies Meta<typeof MonthCalendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithHighlights: Story = {};

export const EmptyMonth: Story = {
  args: {
    highlights: new Map(),
    selectedDate: '2024-06-01',
  },
};

export const SelectedToday: Story = {
  args: {
    month: new Date().toISOString().slice(0, 7),
    selectedDate: new Date().toISOString().slice(0, 10),
    highlights: new Map(),
  },
};

export const CompactMobile: Story = {
  args: {
    month: '2024-08',
    selectedDate: '2024-08-01',
    compact: true,
    highlights: packedMonthHighlights(),
  },
  play: async ({ canvasElement }) => {
    assertHintsStayInCells(canvasElement);
  },
};

export const CompactMobileNarrow = asNarrowStory(CompactMobile);

/** Longest English month name — must shorten on a 360px journal header. */
export const LongMonthName: Story = {
  args: {
    month: '2024-09',
    selectedDate: '2024-09-09',
    compact: true,
    highlights: packedMonthHighlights('2024-09'),
    onGoToToday: fn(),
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.calendar-month--long')).toBeVisible();
  },
};

export const LongMonthNameNarrow = asNarrowStory({
  ...LongMonthName,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.calendar-month--short')).toBeVisible();
  },
});

export const SettingsLegend: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Calendar display settings' }));
    const dialog = canvas.getByRole('dialog', { name: 'Calendar display settings' });
    await expect(within(dialog).getByText('Colors match the numbers in each day cell.')).toBeInTheDocument();
    await expect(within(dialog).getByText('~ml')).toBeInTheDocument();
    await expect(within(dialog).getByRole('checkbox', { name: 'Wet food (g)' })).toBeChecked();
  },
};

export const SettingsLegendNarrow = asNarrowStory(SettingsLegend);
