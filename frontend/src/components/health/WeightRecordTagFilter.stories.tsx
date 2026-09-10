import { useState, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { WeightRecordTagFilter } from './WeightRecordTagFilter';
import { asNarrowStory, assertFitsNarrowViewport, assertPopoverFitsFrame } from '../../stories/viewport';

const tags = [
  { tag: 'Petkit', count: 18 },
  { tag: 'manual', count: 4 },
  { tag: 'vet', count: 1 },
];

const meta = {
  title: 'Components/Health/WeightRecordTagFilter',
  component: WeightRecordTagFilter,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    tags,
    selected: [],
    onChange: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: 220 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WeightRecordTagFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

function FilterPlayground(args: ComponentProps<typeof WeightRecordTagFilter>) {
  const [selected, setSelected] = useState<string[]>(args.selected);
  return <WeightRecordTagFilter {...args} selected={selected} onChange={setSelected} />;
}

export const Closed: Story = {};

export const ShowsSelectedTags: Story = {
  render: FilterPlayground,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const filter = canvas.getByRole('button', { name: 'Filter weight records' });
    await userEvent.click(filter);
    const dialog = canvas.getByRole('dialog', { name: 'Filter weight records' });
    await expect(dialog).toBeVisible();
    await expect(canvas.getByRole('checkbox', { name: 'Show #Petkit' })).toBeInTheDocument();
    await expect(canvas.getByRole('checkbox', { name: 'Show #manual' })).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Show #Petkit' }));
    await expect(canvas.getByRole('checkbox', { name: 'Show #Petkit' })).toBeChecked();
    await expect(filter).toHaveTextContent('1');
    assertPopoverFitsFrame(canvasElement, dialog);
    assertFitsNarrowViewport(canvasElement);
  },
};

export const ShowsSelectedTagsNarrow = asNarrowStory(ShowsSelectedTags);
