export interface LifecyclePlatform {
  onForeground(callback: () => void): () => void;
}

interface EventSource {
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

interface VisibilitySource extends EventSource {
  readonly visibilityState: string;
}

/** Web lifecycle events are only a refresh signal; persisted timestamps remain authoritative. */
export function createWebLifecyclePlatform(documentSource: VisibilitySource, windowSource: EventSource): LifecyclePlatform {
  return {
    onForeground(callback) {
      const onVisibility = () => {
        if (documentSource.visibilityState === 'visible') callback();
      };
      documentSource.addEventListener('visibilitychange', onVisibility);
      windowSource.addEventListener('focus', callback);
      return () => {
        documentSource.removeEventListener('visibilitychange', onVisibility);
        windowSource.removeEventListener('focus', callback);
      };
    },
  };
}

export const webLifecyclePlatform: LifecyclePlatform = {
  onForeground(callback) {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') callback();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', callback);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', callback);
    };
  },
};
