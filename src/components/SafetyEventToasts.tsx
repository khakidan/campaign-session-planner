import React, { useCallback, useState } from 'react';
import type { CampaignId, CampaignPlannerRepository } from '../types';
import { useSafetyEventAlerts, type SafetyEventAlert } from '../hooks/useSafetyEventAlerts';
import type { SafetyControlsPosition } from './SessionSafetyControls';

const POSITION_CLASSES: Record<SafetyControlsPosition, string> = {
  'bottom-right': 'bottom-4 right-4 items-end',
  'bottom-left': 'bottom-4 left-4 items-start',
  'top-right': 'top-4 right-4 items-end',
  'top-left': 'top-4 left-4 items-start',
};

const AUTO_DISMISS_MS = 6000;

export interface SafetyEventToastsProps {
  repository: CampaignPlannerRepository;
  campaignId: CampaignId;
  /** Defaults to `'top-right'` — the opposite end of
   * `SessionSafetyControls`'s own default `'bottom-right'`, so the two
   * don't collide out of the box when both are mounted with default
   * props. */
  position?: SafetyControlsPosition;
}

/**
 * A ready-made GM-side notification stack for a host that doesn't
 * already have its own toast/notification system to pipe
 * `useSafetyEventAlerts` into — wiring that hook's `onSafetyEvent`
 * straight to your own toast library (if you have one) is the
 * recommended path; this component exists for a host that doesn't.
 *
 * Renders nothing until a new Safety Event fires; each toast
 * auto-dismisses after 6 seconds or on click. A standalone,
 * host-placed building block like `SessionRunPanel`/
 * `CampaignHygienePanel` — not auto-mounted anywhere, and deliberately
 * not the same component as `SessionSafetyControls` itself: that one
 * is the Player-side trigger, this one is the GM-side alert, and a
 * host's GM/Player layouts are never the same screen.
 */
export const SafetyEventToasts: React.FC<SafetyEventToastsProps> = ({ repository, campaignId, position = 'top-right' }) => {
  const [toasts, setToasts] = useState<SafetyEventAlert[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleSafetyEvent = useCallback((alert: SafetyEventAlert) => {
    setToasts((prev) => [...prev, alert]);
    setTimeout(() => dismiss(alert.id), AUTO_DISMISS_MS);
  }, [dismiss]);

  useSafetyEventAlerts(repository, campaignId, handleSafetyEvent);

  if (toasts.length === 0) return null;

  return (
    <div className={`fixed z-50 flex flex-col gap-2 ${POSITION_CLASSES[position]}`} role="status" aria-label="Safety alerts">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => dismiss(toast.id)}
          className="flex items-center gap-2 px-3 py-2 bg-[var(--csp-danger-600)] text-white rounded-xl shadow-xl text-left cursor-pointer max-w-xs"
        >
          <span aria-hidden="true">🛡</span>
          <span className="text-sm">
            <span className="font-bold">{toast.tool}</span> triggered
            {toast.triggeredBy ? ` by ${toast.triggeredBy}` : ' by a player'}
          </span>
        </button>
      ))}
    </div>
  );
};
