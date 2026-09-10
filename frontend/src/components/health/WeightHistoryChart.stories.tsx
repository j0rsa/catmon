import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { WeightHistoryChart } from './WeightHistoryChart';
import { mockWeightSummaryDaily, mockWeightSummaryDenseDaily } from '../../stories/fixtures';
import { asNarrowStory } from '../../stories/viewport';

const meta = {
  title: 'Components/Health/WeightHistoryChart',
  component: WeightHistoryChart,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    buckets: mockWeightSummaryDenseDaily,
    granularity: 'daily' as const,
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 640 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WeightHistoryChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DenseDailyByTag: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('#Petkit')).toBeInTheDocument();
    await expect(canvas.getByText('#manual')).toBeInTheDocument();
  },
};

export const LegendIsolatesSeries: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText('#manual'));
    const legend = canvas.getByText('#manual').closest('.recharts-legend-item');
    await expect(legend).toBeTruthy();
  },
};

export const TwoDays: Story = {
  args: {
    buckets: mockWeightSummaryDaily,
  },
};

export const DenseDailyByTagNarrow = asNarrowStory(DenseDailyByTag);
export const LegendIsolatesSeriesNarrow = asNarrowStory(LegendIsolatesSeries);
