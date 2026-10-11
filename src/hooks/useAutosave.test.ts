import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutosave } from './useAutosave';

describe('useAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not autosave on mount — nothing has changed yet', async () => {
    const onAutosave = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useAutosave({ title: 'A' }, { enabled: true, onAutosave }));

    await vi.advanceTimersByTimeAsync(5000);
    expect(onAutosave).not.toHaveBeenCalled();
  });

  it('autosaves once after the debounce delay following a change', async () => {
    const onAutosave = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(({ values }) => useAutosave(values, { enabled: true, delayMs: 1500, onAutosave }), {
      initialProps: { values: { title: 'A' } },
    });

    rerender({ values: { title: 'AB' } });
    await vi.advanceTimersByTimeAsync(1499);
    expect(onAutosave).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(onAutosave).toHaveBeenCalledTimes(1);
    expect(onAutosave).toHaveBeenCalledWith({ title: 'AB' });
  });

  it('coalesces rapid changes into a single save, not one per keystroke', async () => {
    const onAutosave = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(({ values }) => useAutosave(values, { enabled: true, delayMs: 1500, onAutosave }), {
      initialProps: { values: { title: 'A' } },
    });

    for (const title of ['AB', 'ABC', 'ABCD', 'ABCDE']) {
      rerender({ values: { title } });
      await vi.advanceTimersByTimeAsync(500);
    }
    await vi.advanceTimersByTimeAsync(1500);

    expect(onAutosave).toHaveBeenCalledTimes(1);
    expect(onAutosave).toHaveBeenCalledWith({ title: 'ABCDE' });
  });

  it('never autosaves while disabled, e.g. a required field is still empty', async () => {
    const onAutosave = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(({ values, enabled }) => useAutosave(values, { enabled, delayMs: 1500, onAutosave }), {
      initialProps: { values: { title: '' }, enabled: false },
    });

    rerender({ values: { title: 'Typing but still invalid' }, enabled: false });
    await vi.advanceTimersByTimeAsync(5000);
    expect(onAutosave).not.toHaveBeenCalled();
  });

  it('reports status through idle -> saving -> saved', async () => {
    let resolveSave: () => void = () => {};
    const onAutosave = vi.fn(() => new Promise<void>((resolve) => { resolveSave = resolve; }));
    const { result, rerender } = renderHook(({ values }) => useAutosave(values, { enabled: true, delayMs: 1000, onAutosave }), {
      initialProps: { values: { title: 'A' } },
    });

    expect(result.current).toBe('idle');
    rerender({ values: { title: 'AB' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(result.current).toBe('saving');

    await act(async () => {
      resolveSave();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current).toBe('saved');
  });

  it('reports status "error" when the save rejects, without throwing', async () => {
    const onAutosave = vi.fn().mockRejectedValue(new Error('network down'));
    const { result, rerender } = renderHook(({ values }) => useAutosave(values, { enabled: true, delayMs: 1000, onAutosave }), {
      initialProps: { values: { title: 'A' } },
    });

    rerender({ values: { title: 'AB' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(result.current).toBe('error');
  });

  it('does not re-save unchanged values on a re-render with no actual edits', async () => {
    const onAutosave = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(({ values }) => useAutosave(values, { enabled: true, delayMs: 1000, onAutosave }), {
      initialProps: { values: { title: 'A' } },
    });

    rerender({ values: { title: 'A' } });
    await vi.advanceTimersByTimeAsync(5000);
    expect(onAutosave).not.toHaveBeenCalled();
  });
});
