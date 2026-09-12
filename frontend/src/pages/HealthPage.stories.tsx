import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { withHealthPage } from '../stories/decorators';
import { asNarrowStory, assertFitsNarrowViewport, assertPopoverFitsFrame } from '../stories/viewport';
import HealthPage from './HealthPage';

const meta = {
  title: 'Pages/HealthPage',
  component: HealthPage,
  tags: ['autodocs'],
  parameters: { layout: 'padded', route: '/health' },
} satisfies Meta<typeof HealthPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Full health page with weight history chart and recent records. */
export const WithWeightHistory: Story = {
  decorators: [withHealthPage()],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'History' })).toBeInTheDocument();
    await expect(canvas.getByRole('heading', { name: 'Recent records' })).toBeInTheDocument();
    await expect(canvas.getAllByRole('button', { name: 'Delete' }).length).toBeGreaterThan(0);
    await expect(canvas.getAllByText('#Petkit').length).toBeGreaterThan(0);
    await expect(canvas.getByRole('button', { name: 'Filter weight records' })).toBeInTheDocument();
  },
};

/** Dense 30-day history: daily aggregation with Petkit vs manual series. */
export const DenseHistory: Story = {
  decorators: [withHealthPage({ dense: true })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText('#Petkit').length).toBeGreaterThan(0);
    await expect(canvas.getAllByText('#manual').length).toBeGreaterThan(0);
  },
};

/** Year of monthly-bucketed measurements — shows min/max range lines on the chart. */
export const LongHistory: Story = {
  decorators: [withHealthPage({ longHistory: true })],
};

/** Switching 30d / 90d / 1y / all keeps the chart on the matching bucket size. */
export const PeriodsStayReadable: Story = {
  decorators: [withHealthPage({ dense: true, longHistory: true })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = canvas.getByRole('heading', { name: 'History' }).closest('.panel');
    await expect(panel).toBeTruthy();
    const weight = within(panel as HTMLElement);
    await expect(weight.getByRole('button', { name: '30d' })).toBeInTheDocument();
    await userEvent.click(weight.getByRole('button', { name: '90d' }));
    await expect(weight.getAllByText('#Petkit').length).toBeGreaterThan(0);
    await userEvent.click(weight.getByRole('button', { name: '1y' }));
    await expect(weight.getAllByText('#Petkit').length).toBeGreaterThan(0);
    await userEvent.click(weight.getByRole('button', { name: 'all' }));
    await expect(weight.getAllByText('#Petkit').length).toBeGreaterThan(0);
    assertFitsNarrowViewport(canvasElement);
  },
};

export const PeriodsStayReadableNarrow = asNarrowStory(PeriodsStayReadable);

/** No measurements recorded yet. */
export const Empty: Story = {
  decorators: [withHealthPage({ empty: true })],
};

/** Loading state. */
export const Loading: Story = {
  decorators: [withHealthPage({ loading: true })],
};

export const EditNote: Story = {
  decorators: [withHealthPage()],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = canvas.getByRole('heading', { name: 'Recent records' }).closest('.panel');
    await expect(panel).toBeTruthy();
    const petkit = within(panel as HTMLElement).getAllByText('#Petkit')[0].closest('li');
    await expect(petkit).toBeTruthy();
    await userEvent.click(within(petkit as HTMLElement).getByRole('button', { name: 'Edit' }));
    await expect(canvas.getByLabelText('Edit weight note')).toHaveValue('#Petkit toileting');
  },
};

export const WithWeightHistoryNarrow = asNarrowStory(WithWeightHistory);
export const DenseHistoryNarrow = asNarrowStory(DenseHistory);
export const EditNoteNarrow = asNarrowStory(EditNote);

export const FilterShowsTag: Story = {
  decorators: [withHealthPage()],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = canvas.getByRole('heading', { name: 'Recent records' }).closest('.panel');
    await expect(panel).toBeTruthy();
    const records = within(panel as HTMLElement);
    await userEvent.click(records.getByRole('button', { name: 'Filter weight records' }));
    const dialog = records.getByRole('dialog', { name: 'Filter weight records' });
    await expect(dialog).toBeVisible();
    await userEvent.click(records.getByRole('checkbox', { name: 'Show #Petkit' }));
    const list = (panel as HTMLElement).querySelector('.weight-record-list');
    await expect(list).toBeTruthy();
    await expect(within(list as HTMLElement).getAllByText('#Petkit').length).toBeGreaterThan(0);
    await expect(within(list as HTMLElement).queryByText('#manual')).not.toBeInTheDocument();
    assertPopoverFitsFrame(canvasElement, dialog);
    assertFitsNarrowViewport(canvasElement);
  },
};

export const FilterShowsTagNarrow = asNarrowStory(FilterShowsTag);
