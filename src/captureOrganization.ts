import type {Capture} from './types';

export type CaptureOrganizationAction = {
  captureId: string;
  originalText: string;
  type: 'task' | 'event' | 'goal' | 'note' | 'capture';
  title: string;
  date?: string;
  goal?: string;
  goalId?: string;
  _remove?: boolean;
  [key: string]: unknown;
};

/** Associate model output with saved captures. Ambiguous results fail closed. */
export function associateCaptureSuggestions(
  actions: unknown,
  captures: Pick<Capture, 'id' | 'text'>[],
): CaptureOrganizationAction[] {
  if (!Array.isArray(actions)) return [];
  const allowed = new Set(['task', 'event', 'goal', 'note', 'capture']);
  return actions.flatMap((value: any) => {
    if (!value || typeof value !== 'object' || !allowed.has(value.type)) return [];
    const capture = captures.find(item => item.id === value.captureId)
      || captures.find(item => typeof value.originalText === 'string' && item.text === value.originalText)
      || (captures.length === 1 ? captures[0] : undefined);
    const title = String(value.title || value.text || '').trim();
    if (!capture || (value.type !== 'note' && value.type !== 'capture' && !title)) return [];
    return [{ ...value, captureId: capture.id, originalText: capture.text, title } as CaptureOrganizationAction];
  });
}
