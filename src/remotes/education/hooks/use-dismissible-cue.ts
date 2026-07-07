import { useCallback, useEffect, useState } from 'react';
import { dismissCallout, shouldShowCallout } from '@/platform/education/cue-store';

/**
 * EDU-4's per-cue visibility hook (design.md §9.1). Unlike betmeet-clone's
 * synchronous `localStorage` read (a `useSyncExternalStore` trick reading
 * during first render), `AsyncStorage` is not synchronous — this hook
 * defaults to `visible: true` until the real value resolves via a
 * `useEffect`. Fail-open applies to the loading gap too: a callout never
 * flashes hidden-then-shown, only shown-then-possibly-hidden once the real
 * value is known (the safer direction for a "don't accidentally suppress
 * information" cue).
 *
 * `dismiss()` is optimistic — it flips local state synchronously and fires
 * the (fail-open, never-throwing) persistence write in the background; no
 * re-read is needed.
 */
export function useDismissibleCue(cueId: string) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let isMounted = true;
    shouldShowCallout(cueId).then(result => {
      if (isMounted) {
        setVisible(result);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [cueId]);

  const dismiss = useCallback(() => {
    setVisible(false);
    dismissCallout(cueId).catch(() => {});
  }, [cueId]);

  return { visible, dismiss };
}
