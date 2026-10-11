import { useEffect, useRef, useState } from 'react';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UseAutosaveOptions<T> {
  /** Whether autosave should fire at all right now — e.g. false while a
   * required field (Title/Name) is still empty, so a brand-new,
   * untouched editor never creates a blank record in the background. */
  enabled: boolean;
  /** Debounce delay, in ms, after the last change before autosaving. */
  delayMs?: number;
  /** Persists the current values. A thrown/rejected error sets status
   * to 'error' and is otherwise swallowed — autosave is a silent
   * background safety net, not the place that surfaces validation
   * errors; the explicit Save button remains the authoritative path
   * for that. */
  onAutosave: (values: T) => Promise<void>;
}

/**
 * Debounced background autosave for an in-progress edit (ROADMAP.md's
 * "Campaign Planner Notes App" — Dan lost work a few times to a
 * forgotten Save, a reload, or an accidental close). Generic over the
 * form-values shape so every Editor (Note/Npc/Group/Location/Session)
 * shares this one hook rather than reimplementing debounce/skip logic
 * five times.
 *
 * Skips the first render (nothing has changed yet — there's nothing to
 * save) and any tick where `values` is reference-stable-but-unchanged
 * in content since the last successful save, so idle time with the
 * editor open never fires redundant saves.
 */
export function useAutosave<T>(values: T, { enabled, delayMs = 1500, onAutosave }: UseAutosaveOptions<T>): AutosaveStatus {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const lastSavedJsonRef = useRef<string>(JSON.stringify(values));
  const isFirstRenderRef = useRef(true);
  const savingRef = useRef(false);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    if (!enabled) return;

    const valuesJson = JSON.stringify(values);
    if (valuesJson === lastSavedJsonRef.current) return;

    const timer = setTimeout(() => {
      if (savingRef.current) return;
      savingRef.current = true;
      setStatus('saving');
      onAutosave(values)
        .then(() => {
          lastSavedJsonRef.current = valuesJson;
          setStatus('saved');
        })
        .catch(() => {
          setStatus('error');
        })
        .finally(() => {
          savingRef.current = false;
        });
    }, delayMs);

    return () => clearTimeout(timer);
    // `onAutosave` is expected to be stable-enough per caller (closes over
    // ids/refs, not recreated every keystroke); including it would retrigger
    // the debounce timer on every parent render for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, enabled, delayMs]);

  return status;
}
