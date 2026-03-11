import {
  logFormFileFormat,
  Pages,
  pageKeys,
  panelStore,
  tabStore,
} from "~/store/GlobalState.ts";
import { createSignal, Show } from "solid-js";
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
        tabName: "New Tab",
      },
      tabPage: {
        loggingTabPage: {
          title: "New file",
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
      console.log(tabCtx[0]);
    }
    setRender(true);
  };

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
