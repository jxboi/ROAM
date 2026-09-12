import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRovingTabs } from './tablist';

describe('roving tabindex keyboard behaviour', () => {
  it('names ids from the label, collapsing every space rather than just the first', () => {
    const setActive = vi.fn();
    const { result } = renderHook(() => useRovingTabs(['Overview', 'Good to know', 'A B C'], 'Overview', setActive, 'tab'));
    expect(result.current.tabId('Good to know')).toBe('tab-Good-to-know');
    expect(result.current.tabId('A B C')).toBe('tab-A-B-C');
  });

  it('cycles forward and back, wrapping at either end, using the real tab count rather than a hardcoded one', () => {
    const labels = ['A', 'B', 'C', 'D'];
    const cases: [string, string, string][] = [
      ['A', 'ArrowRight', 'B'],
      ['D', 'ArrowRight', 'A'],
      ['A', 'ArrowLeft', 'D'],
      ['C', 'ArrowLeft', 'B'],
      ['C', 'Home', 'A'],
      ['A', 'End', 'D'],
    ];
    for (const [active, key, expected] of cases) {
      const setActive = vi.fn();
      const { result } = renderHook(() => useRovingTabs(labels, active, setActive, 'tab'));
      const preventDefault = vi.fn();
      act(() => {
        result.current.onKeyDown({ key, preventDefault } as unknown as React.KeyboardEvent<HTMLButtonElement>);
      });
      expect(setActive, `${active} + ${key}`).toHaveBeenCalledWith(expected);
      expect(preventDefault).toHaveBeenCalledOnce();
    }
  });

  it('moves focus to the tab it just selected', () => {
    document.body.innerHTML = '<button id="tab-B"></button>';
    const setActive = vi.fn();
    const { result } = renderHook(() => useRovingTabs(['A', 'B'], 'A', setActive, 'tab'));
    const focusSpy = vi.spyOn(document.getElementById('tab-B')!, 'focus');
    act(() => {
      result.current.onKeyDown({ key: 'ArrowRight', preventDefault: () => {} } as unknown as React.KeyboardEvent<HTMLButtonElement>);
    });
    expect(focusSpy).toHaveBeenCalledOnce();
  });

  it('ignores keys that are not part of tab navigation', () => {
    const setActive = vi.fn();
    const { result } = renderHook(() => useRovingTabs(['A', 'B'], 'A', setActive, 'tab'));
    const preventDefault = vi.fn();
    act(() => {
      result.current.onKeyDown({ key: 'Tab', preventDefault } as unknown as React.KeyboardEvent<HTMLButtonElement>);
    });
    expect(setActive).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
  });
});
