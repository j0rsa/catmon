import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { DEFAULT_NUTRITION_CALENDAR_SETTINGS } from '../api/userSettings';
import { asNarrowStory } from '../stories/viewport';
import { NutritionCalendarSettingsFields } from './NutritionCalendarSettingsFields';

const meta = {
  title: 'Calendar/NutritionCalendarSettingsFields',
  component: NutritionCalendarSettingsFields,
  tags: ['autodocs'],
  args: {
    settings: DEFAULT_NUTRITION_CALENDAR_SETTINGS,
    onChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="widget-settings-popover" style={{ position: 'static' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NutritionCalendarSettingsFields>;

export default meta;
type Story = StoryObj<typeof meta>;

function assertLegendUsesCellColors(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  expect(canvas.getByText('Colors match the numbers in each day cell.')).toBeInTheDocument();
  const fluid = canvasElement.querySelector('.calendar-hint--fluid');
  const wet = canvasElement.querySelector('.calendar-hint--wet');
  const liquids = canvasElement.querySelector('.calendar-hint--liquids');
  const water = canvasElement.querySelector('.calendar-hint--water');
  const dry = canvasElement.querySelector('.calendar-hint--dry');
  expect(fluid, 'fluid legend').toBeTruthy();
  expect(wet, 'wet food legend').toBeTruthy();
  expect(liquids, 'liquids legend').toBeTruthy();
  expect(water, 'water legend').toBeTruthy();
  expect(dry, 'dry food legend').toBeTruthy();
  const fluidColor = getComputedStyle(fluid!).color;
  const wetColor = getComputedStyle(wet!).color;
  const liquidsColor = getComputedStyle(liquids!).color;
  const waterColor = getComputedStyle(water!).color;
  expect(fluidColor, 'fluid colour should differ from wet food').not.toBe(wetColor);
  expect(liquidsColor, 'liquids colour should differ from water').not.toBe(waterColor);
  expect(canvas.getByRole('checkbox', { name: 'Total fluid (ml)' })).toBeChecked();
}

export const Default: Story = {
  play: async ({ canvasElement }) => {
    assertLegendUsesCellColors(canvasElement);
  },
};

export const ToggleWetFood: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Wet food (g)' }));
    expect(args.onChange).toHaveBeenCalledWith({ show_wet_food: false });
  },
};

export const DefaultNarrow = asNarrowStory(Default);
export const ToggleWetFoodNarrow = asNarrowStory(ToggleWetFood);
