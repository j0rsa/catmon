import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { WeightRecordList } from './WeightRecordList';
import { mockWeightRecords } from '../../stories/fixtures';
import { asNarrowStory } from '../../stories/viewport';

const meta = {
  title: 'Components/Health/WeightRecordList',
  component: WeightRecordList,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    records: mockWeightRecords,
    canWrite: true,
    formatWhen: (record) => `${record.local_date.slice(8)}.${record.local_date.slice(5, 7)} ${record.measured_at.slice(11, 16)}`,
    onUpdateNote: () => {},
    onDelete: () => {},
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WeightRecordList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReadMode: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText('#Petkit').length).toBeGreaterThan(0);
    await expect(canvas.getAllByText('toileting').length).toBeGreaterThan(0);
    await expect(canvas.getAllByText('#manual').length).toBeGreaterThan(0);
    await expect(canvas.getAllByRole('button', { name: 'Edit' }).length).toBeGreaterThan(0);
    await expect(canvas.getAllByRole('button', { name: 'Delete' }).length).toBeGreaterThan(0);
    await expect(canvas.queryByDisplayValue('#Petkit toileting')).not.toBeInTheDocument();
  },
};

export const Editing: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const petkitRow = canvas.getAllByText('#Petkit')[0].closest('li');
    await expect(petkitRow).toBeTruthy();
    const edit = within(petkitRow as HTMLElement).getByRole('button', { name: 'Edit' });
    await userEvent.click(edit);
    const input = canvas.getByLabelText('Edit weight note');
    await expect(input).toHaveValue('#Petkit toileting');
    await expect(canvas.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  },
};

export const ReadModeNarrow = asNarrowStory(ReadMode);
export const EditingNarrow = asNarrowStory(Editing);
