import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import SchedulesPage from './SchedulesPage';
import { withSchedulesPage } from '../stories/decorators';
import { asNarrowStory } from '../stories/viewport';

const meta = {
  title: 'Pages/SchedulesPage',
  component: SchedulesPage,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof SchedulesPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithSchedules: Story = {
  decorators: [withSchedulesPage()],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: /Feeding schedules for Mittens/i })).toBeInTheDocument();
    await expect(canvas.getByText('Mittens hydration routine')).toBeInTheDocument();
    await expect(canvas.getByText('Wet food plan')).toBeInTheDocument();
    const reminders = canvas.getAllByRole('checkbox', { name: 'Feeding reminder' });
    await expect(reminders).toHaveLength(2);
    await expect(reminders[0]).not.toBeChecked();
    await expect(reminders[1]).toBeChecked();
    await expect(canvas.getAllByText(/One reminder per feeding time per day/i)).toHaveLength(2);
  },
};

export const Empty: Story = {
  decorators: [withSchedulesPage({ empty: true })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/No feeding schedules yet/i)).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: '+ new schedule' }));
    await expect(canvas.getByLabelText('Schedule name')).toBeInTheDocument();
  },
};

export const WithSchedulesNarrow = asNarrowStory(WithSchedules);
export const EmptyNarrow = asNarrowStory(Empty);
