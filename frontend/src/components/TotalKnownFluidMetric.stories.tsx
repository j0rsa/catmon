import type { Meta, StoryObj } from '@storybook/react-vite';
import type React from 'react';
import { expect, within } from 'storybook/test';
import { asNarrowStory } from '../stories/viewport';
import { TotalKnownFluidMetric } from './TotalKnownFluidMetric';

/** Same DOM as NutritionDayPanel — catches `.metric-card strong span` overrides. */
function MetricCardFrame({ children }: { children: React.ReactNode }) {
  return <article className="metric-card">{children}</article>;
}

const meta = {
  title: 'Nutrition/TotalKnownFluidMetric',
  component: TotalKnownFluidMetric,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MetricCardFrame>
        <Story />
      </MetricCardFrame>
    ),
  ],
} satisfies Meta<typeof TotalKnownFluidMetric>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AheadOfSchedule: Story = {
  args: {
    totalFluidMl: 123,
    scheduledMl: 120,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/123/)).toBeTruthy();
    await expect(canvas.getByText(/scheduled 120/)).toBeTruthy();
    await expect(canvas.getByText(/▲/)).toBeTruthy();
    const hint = canvas.getByText(/scheduled 120/).closest('.metric-fluid-schedule-hint--ahead');
    expect(hint).toBeTruthy();
    expect(getComputedStyle(hint!).color).toBe('rgb(61, 154, 106)');
  },
};

export const BehindSchedule: Story = {
  args: {
    totalFluidMl: 121,
    scheduledMl: 130,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/▼/)).toBeTruthy();
    await expect(canvas.getByText(/scheduled 130/)).toBeTruthy();
    const hint = canvas.getByText(/scheduled 130/).closest('.metric-fluid-schedule-hint--behind');
    expect(hint).toBeTruthy();
  },
};

export const NoSchedule: Story = {
  args: {
    totalFluidMl: 90,
    scheduledMl: null,
  },
};

export const AheadOfScheduleNarrow = asNarrowStory(AheadOfSchedule);
export const BehindScheduleNarrow = asNarrowStory(BehindSchedule);
