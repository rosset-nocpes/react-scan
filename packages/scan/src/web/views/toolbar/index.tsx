// @TODO: @pivanov - finish the pin functionality
import { useSignalEffect } from '@preact/signals';
import { useCallback, useEffect, useState } from 'preact/hooks';
import {
  type LocalStorageOptions,
  ReactScanInternals,
  Store,
} from '~core/index';
import { Icon } from '~web/components/icon';
import { Toggle } from '~web/components/toggle';
import { cn, readLocalStorage, saveLocalStorage } from '~web/utils/helpers';
import { constant } from '~web/utils/preact/constant';
import { FPSMeter } from '~web/widget/fps-meter';
import { Notification } from '../notifications/icons';
import { getEventSeverity } from '../notifications/data';
import { useAppNotifications } from '../notifications/notifications';
import { signalWidgetViews } from '~web/state';

export const Toolbar = constant(() => {
  // const refSettingsButton = useRef<HTMLButtonElement>(null);
  // const [isPinned, setIsPinned] = useState(false);
  // const [metadata, setMetadata] = useState<FiberMetadata | null>(null);
  const events = useAppNotifications();
  const [laggedEvents, setLaggedEvents] = useState(events);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLaggedEvents(events);
      // 500 + buffer to never see intermediary state
      // todo: check if we still need this large of buffer
    }, 500 + 100);
    return () => {
      clearTimeout(timeout);
    };
  }, [events.length]);

  const inspectState = Store.inspectState;
  const isInspectActive = inspectState.value.kind === 'inspecting';
  const isInspectFocused = inspectState.value.kind === 'focused';

  const onToggleInspect = useCallback(() => {
    const currentState = Store.inspectState.value;

    switch (currentState.kind) {
      case 'inspecting': {
        signalWidgetViews.value = {
          view: 'none',
        };
        Store.inspectState.value = {
          kind: 'inspect-off',
        };
        return;
      }

      case 'focused': {
        Store.inspectState.value = {
          kind: 'inspecting',
          hoveredDomElement: null,
        };
        return;
      }
      case 'inspect-off': {
        signalWidgetViews.value = {
          view: 'inspector',
        };
        Store.inspectState.value = {
          kind: 'inspecting',
          hoveredDomElement: null,
        };
        return;
      }
      case 'uninitialized': {
        return;
      }
    }
    currentState satisfies never;
  }, []);

  const onToggleActive = useCallback((e: Event) => {
    e.preventDefault();
    e.stopPropagation();

    if (!ReactScanInternals.instrumentation) {
      return;
    }
    // todo: set a single source of truth
    const isPaused = !ReactScanInternals.instrumentation.isPaused.value;
    ReactScanInternals.instrumentation.isPaused.value = isPaused;
    const existingLocalStorageOptions =
      readLocalStorage<LocalStorageOptions>('react-scan-options');
    saveLocalStorage('react-scan-options', {
      ...existingLocalStorageOptions,
      enabled: !isPaused,
    });
  }, []);

  // const onToggleSettings = useCallback(() => {
  //   signalIsSettingsOpen.value = !signalIsSettingsOpen.value;
  // }, []);

  useSignalEffect(() => {
    const state = Store.inspectState.value;
    if (state.kind === 'uninitialized') {
      Store.inspectState.value = {
        kind: 'inspect-off',
      };
    }

    // if (state.kind === 'focused' && state.fiber) {
    //   const pinned = readLocalStorage<FiberMetadata>('react-scann-pinned');
    //   setIsPinned(!!pinned);

    //   const m = getFiberMetadata(state.fiber);
    //   if (m !== null) {
    //     setMetadata(m);
    //   }
    // }
  });

  // const onTogglePin = useCallback(() => {
  //   if (isPinned) {
  //     removeLocalStorage('react-scann-pinned');
  //     setIsPinned(false);
  //   } else {
  //     saveLocalStorage('react-scann-pinned', metadata);
  //     setIsPinned(true);
  //   }
  // }, [isPinned, metadata]);

  let inspectIcon = null;
  let inspectColor = '#999';

  if (isInspectActive) {
    inspectIcon = <Icon name="icon-inspect" />;
    inspectColor = '#8e61e3';
  } else if (isInspectFocused) {
    inspectIcon = <Icon name="icon-focus" />;
    inspectColor = '#8e61e3';
  } else {
    inspectIcon = <Icon name="icon-inspect" />;
    inspectColor = '#999';
  }

  return (
    <div className="flex max-h-9 min-h-9 flex-1 items-stretch overflow-hidden">
      <div className="h-full flex items-center min-w-fit">
        <button
          type="button"
          id="react-scan-inspect-element"
          title="Inspect element"
          onClick={onToggleInspect}
          className="button flex items-center justify-center h-full w-full pl-3 pr-2.5"
          style={{ color: inspectColor }}
        >
          {inspectIcon}
        </button>

        {/* <Toggle
          checked={!ReactScanInternals.instrumentation?.isPaused.value}
          onChange={onToggleActive}
          title={
            ReactScanInternals.instrumentation?.isPaused.value
              ? 'Start'
              : 'Stop'
          }
        /> */}

        {/* {
          isInspectFocused && (
            <button
              type="button"
              title={isPinned ? 'Unpin component' : 'Pin component'}
              onClick={onTogglePin}
              className="button flex items-center justify-center px-3 h-full"
            >
              <Icon
                name={isPinned ? 'icon-lock-open' : 'icon-lock'}
                className={cn(
                  'text-neutral-400',
                  {
                    'text-white': isPinned,
                  }
                )}
              />
            </button>
          )
        } */}
      </div>

      <div className="h-full flex items-center justify-center">
        <button
          type="button"
          id="react-scan-notifications"
          onClick={() => {
            switch (signalWidgetViews.value.view) {
              case 'inspector': {
                Store.inspectState.value = {
                  kind: 'inspect-off',
                };
                signalWidgetViews.value = {
                  view: 'notifications',
                };
                return;
              }
              case 'notifications': {
                signalWidgetViews.value = {
                  view: 'none',
                };
                return;
              }
              case 'none': {
                signalWidgetViews.value = {
                  view: 'notifications',
                };
                return;
              }
            }
            // exhaustive check
            signalWidgetViews.value satisfies never;
          }}
          className="button flex items-center justify-center h-full pl-2.5 pr-2.5"
          style={{ color: inspectColor }}
        >
          <Notification
            events={laggedEvents.map(
              (event) => getEventSeverity(event) === 'high',
            )}
            size={16}
            className={cn([
              'text-[#999]',
              signalWidgetViews.value.view === 'notifications' &&
                'text-[#8E61E3]',
            ])}
          />
        </button>
      </div>
      {/* todo: cleanup css */}
      <div className={cn(['min-w-fit flex flex-col items-center'])}>
        <div className="h-full flex items-center justify-center">
          <Toggle
            checked={!ReactScanInternals.instrumentation?.isPaused.value}
            onChange={onToggleActive}
          />
        </div>
      </div>

      {/* todo add back showFPS*/}
      {ReactScanInternals.options.value.showFPS && <FPSMeter />}
    </div>
  );
});
