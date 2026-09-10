import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { NumberField } from './NumberField';

function Controlled({ start = 85, onValue }: { start?: number; onValue?: (value: number) => void }) {
  const [value, setValue] = useState(start);
  return (
    <>
      <NumberField
        aria-label="Accommodation cost in USD"
        min={0}
        max={10000}
        value={value}
        onChange={next => { setValue(next); onValue?.(next); }}
      />
      <output data-testid="value">{value}</output>
      <button onClick={() => setValue(75)}>restore</button>
    </>
  );
}

const field = () => screen.getByLabelText('Accommodation cost in USD');

describe('number field', () => {
  it('lets the field sit empty while a new number is typed', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.clear(field());
    expect(field()).toHaveValue(null);

    await user.type(field(), '120');
    expect(field()).toHaveValue(120);
    expect(screen.getByTestId('value')).toHaveTextContent('120');
  });

  it('treats an empty field as the minimum while it is empty', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.clear(field());
    expect(screen.getByTestId('value')).toHaveTextContent('0');
  });

  it('settles an empty field to the minimum on blur', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.clear(field());
    await user.tab();
    expect(field()).toHaveValue(0);
    expect(screen.getByTestId('value')).toHaveTextContent('0');
  });

  it('clamps values outside the allowed range', async () => {
    const user = userEvent.setup();
    render(<Controlled start={0} />);
    await user.clear(field());
    await user.type(field(), '99999');
    expect(screen.getByTestId('value')).toHaveTextContent('10000');
  });

  it('never reports a value that is not a number', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Controlled onValue={onValue} />);
    await user.clear(field());
    await user.type(field(), '1e');
    await user.tab();
    for (const [reported] of onValue.mock.calls) expect(Number.isFinite(reported)).toBe(true);
    expect(Number.isFinite(Number(screen.getByTestId('value').textContent))).toBe(true);
  });

  it('picks up a value changed from elsewhere, such as restoring the suggestion', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.clear(field());
    await user.type(field(), '300');
    await user.tab();
    await user.click(screen.getByRole('button', { name: 'restore' }));
    expect(field()).toHaveValue(75);
  });
});
