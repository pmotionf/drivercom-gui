import {
  logFormFileFormat,
  Pages,
  pageKeys,
  panelStore,
  tabStore,
  recentLogFilePaths,
} from "~/store/GlobalState.ts";
import { createEffect, createSignal, on, Show } from "solid-js";
import { onMount } from "solid-js";
import { LoggingAccordionStates } from "~/components/Form.tsx";

import {
  PanelLayout,
  PanelSizeContext,
} from "~/components/Panel/PanelLayout.tsx";
import { createStore } from "solid-js/store";
import {
  TabContext,
  TabList,
  TabListContext,
} from "~/components/Tab/TabList.tsx";
import { Panel } from "~/components/Panel/Panel.tsx";
import { LoggingTabContent } from "./LoggingTabContent.tsx";
import JSON5 from "json5";
import { load } from "@tauri-apps/plugin-store";

export type LoggingFormType = {
  title: string;
  filePath: string;
  portId: string;
  logConfig: object;
  accordionStates: LoggingAccordionStates;
  originalFile: object;
};

export type LoggingPageTabContentType = LoggingFormType;

export function Logging() {
  const [render, setRender] = createSignal<boolean>(false);

  // Add a logging tab first if no tabs exist.
  onMount(async () => {
    if (!pageKeys.has(Pages.Logging)) {
      const panelKey = crypto.randomUUID();
      pageKeys.set(Pages.Logging, panelKey);

      const panelStoreKey = crypto.randomUUID();
      panelStore.set(
        panelKey,
        createSignal<PanelSizeContext[]>([{ id: panelStoreKey, size: 100 }]),
      );
      tabStore.set(
        panelStoreKey,
        createStore<TabListContext>({ tabContext: [], focusedTab: "" }),
      );
      createLoggingTab(panelStoreKey);
    }
    setRender(true);
  });

  const createLoggingTab = (key: string) => {
    const id = crypto.randomUUID();
    const accordionStates: LoggingAccordionStates = new Map();
    const newTab: TabContext = {
      tab: {
        id: id,
        tabName: "New file",
      },
      tabPage: {
        loggingTabPage: {
          title: "No port",
          portId: "",
          logConfig: JSON5.parse(JSON5.stringify(logFormFileFormat())),
          originalFile: JSON5.parse(JSON5.stringify(logFormFileFormat())),
          filePath: "",
          accordionStates: accordionStates,
        },
        configTabPage: null,
        logViewerTabPage: null,
      },
    };

    if (tabStore.has(key)) {
      const tabCtx = tabStore.get(key)!;
      tabCtx[1]("tabContext", tabCtx[0].tabContext.length, newTab);
      setTimeout(() => {
        tabCtx[1]("focusedTab", newTab.tab.id);
      });
    }
    setRender(true);
  };

  // This effect runs  whenever recent config file path list is updated,
  // and save it directly to disk via the Tauri Store API().
  // We can't rely onCleanup for this, since cleanup callbacks aren't
  // guaranteed to run if the window is closed abruptly.
  // That's why we save on every update inside the effect body itself,
  // instead of deferring it to cleanup.
  createEffect(
    on(
      () => recentLogFilePaths(),
      async () => {
        const store = await load("store.json", {
          defaults: {
            configFilePath: undefined,
            logFilePath: undefined,
            ipHistory: undefined,
          },
          autoSave: false,
        });
        store.set("logFilePath", recentLogFilePaths());
      },
      { defer: true },
    ),
  );

  return (
    <Show when={render()}>
      <PanelLayout id={Pages.Logging}>
        <Panel>
          <TabList onCreateTab={(key) => createLoggingTab(key)}>
            <LoggingTabContent />
          </TabList>
        </Panel>
      </PanelLayout>
    </Show>
  );
}

export default Logging;
