import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { asNarrowStory } from '../stories/viewport';
import { TotalKnownFluidMetric } from './TotalKnownFluidMetric';

const meta = {
  title: 'Nutrition/TotalKnownFluidMetric',
  component: TotalKnownFluidMetric,
  tags: ['autodocs'],
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
