import {
  configFormFileFormat,
  Pages,
  pageKeys,
  tabStore,
  panelStore,
  recentConfigFilePaths,
} from "~/GlobalState.ts";
import { Panel } from "~/components/Panel.tsx";
import { PanelLayout, PanelSizeContext } from "~/components/PanelLayout.tsx";
import { TabContext, TabList, TabListContext } from "~/components/TabList.tsx";
import { ConfigTabContent } from "./Configuration/ConfigTabContent.tsx";
import { GainLockStates, LinkStates } from "~/components/ConfigForm.tsx";
import { AccordionStates } from "~/components/Form.tsx";
import { createEffect, createSignal, on, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { load } from "@tauri-apps/plugin-store";

function Configuration() {
  const [render, setRender] = createSignal<boolean>(false);

  onMount(() => {
    if (!pageKeys.has(Pages.Configuration)) {
      const panelKey = crypto.randomUUID();
      pageKeys.set(Pages.Configuration, panelKey);

      const panelTabId = crypto.randomUUID();
      panelStore.set(
        panelKey,
        createSignal<PanelSizeContext[]>([{ id: panelTabId, size: 100 }]),
      );
      tabStore.set(
        panelTabId,
        createStore<TabListContext>({ tabContext: [], focusedTab: "" }),
      );
      createTab(panelTabId);
    }
    setRender(true);
  });

  const createTab = (key: string) => {
    const id = crypto.randomUUID();
    const accordionStatuses: AccordionStates = new Map();
    const linkedStatuses: LinkStates = new Map();
    const gainLockStatuses: GainLockStates = new Map();
    const newForm = JSON.parse(JSON.stringify(configFormFileFormat()));
    const newTab = {
      tab: {
        id: id,
        tabName: "New Tab",
      },
      tabPage: {
        configTabPage: {
          filePath: "",
          portId: "",
          configForm: newForm,
          configAccordionStatuses: accordionStatuses,
          configLinkedStatuses: linkedStatuses,
          configGainLockStatuses: gainLockStatuses,
          formName: "New File",
          originalFile: JSON.parse(JSON.stringify(configFormFileFormat())),
        },
      },
    } as TabContext;

    if (tabStore.has(key)) {
      const tabCtx = tabStore.get(key)!;
      tabCtx[1]({
        tabContext: [...tabCtx[0].tabContext, newTab],
        focusedTab: newTab.tab.id,
      });
    }
  };

  createEffect(
    on(
      () => recentConfigFilePaths(),
      async () => {
        const store = await load("store.json", {
          defaults: {
            configFilePath: undefined,
            logFilePath: undefined,
            ipHistory: undefined,
          },
          autoSave: false,
        });
        store.set("configFilePath", recentConfigFilePaths());
      },
      { defer: true },
    ),
  );

  return (
    <Show when={render()}>
      <PanelLayout id={Pages.Configuration}>
        <Panel>
          <TabList onCreateTab={(key) => createTab(key)}>
            <ConfigTabContent />
          </TabList>
        </Panel>
      </PanelLayout>
    </Show>
  );
}

export default Configuration;
