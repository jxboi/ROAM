import { useCallback } from 'react';
import type { KeyboardEvent } from 'react';

/** Turns a tab label into the DOM id fragment it appears under. */
const slug = (label: string) => label.replaceAll(' ', '-');

/**
 * Keyboard behaviour for a WAI-ARIA tablist: ArrowLeft/ArrowRight cycle
 * between tabs (wrapping at either end), Home/End jump to the first/last.
 *
 * Shared so the app's two tab strips (the ride page, the planner) can't
 * drift the way they already had: one used `.replace` instead of
 * `.replaceAll` for the id slug, which only broke once a label needed more
 * than one substitution, and both hardcoded the wrap-around modulus to the
 * tab count they happened to have rather than deriving it from the list.
 */
export function useRovingTabs(
  labels: string[],
  active: string,
  setActive: (label: string) => void,
  idPrefix: string,
) {
  const tabId = useCallback((label: string) => `${idPrefix}-${slug(label)}`, [idPrefix]);

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = labels.indexOf(active);
    const next = event.key === 'Home'
      ? labels[0]
      : event.key === 'End'
        ? labels[labels.length - 1]
        : labels[(index + (event.key === 'ArrowRight' ? 1 : labels.length - 1)) % labels.length];
    setActive(next);
    document.getElementById(tabId(next))?.focus();
  }, [labels, active, setActive, tabId]);

  return { tabId, onKeyDown };
}
