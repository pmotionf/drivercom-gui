import {
  configFormFileFormat,
  Pages,
  pageKeys,
  tabContexts,
  panelContexts,
} from "~/GlobalState.ts";
import { Panel } from "~/components/Panel.tsx";
import { PanelLayout, PanelSizeContext } from "~/components/PanelLayout.tsx";
import { TabContext, TabList, TabListContext } from "~/components/TabList.tsx";
import { ConfigTabContent } from "./Configuration/ConfigTabContent.tsx";
import { GainLockStates, LinkStates } from "~/components/ConfigForm.tsx";
import { AccordionStates } from "~/components/Form.tsx";
import { ConnectButton } from "./Connect/ConnectButton.tsx";
import { createSignal, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";

function Configuration() {
  const [render, setRender] = createSignal<boolean>(false);

  onMount(() => {
    if (!pageKeys.has(Pages.Configuration)) {
      const panelKey = crypto.randomUUID();
      pageKeys.set(Pages.Configuration, panelKey);

      const panelTabId = crypto.randomUUID();
      panelContexts.set(
        panelKey,
        createSignal<PanelSizeContext[]>([{ id: panelTabId, size: 100 }]),
      );
      tabContexts.set(
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
          configForm: newForm,
          configAccordionStatuses: accordionStatuses,
          configLinkedStatuses: linkedStatuses,
          configGainLockStatuses: gainLockStatuses,
          formName: "New File",
        },
      },
    } as TabContext;

    if (tabContexts.has(key)) {
      const tabCtx = tabContexts.get(key)!;
      tabCtx[1]({
        tabContext: [...tabCtx[0].tabContext, newTab],
        focusedTab: newTab.tab.id,
      });
    }
  };

  return (
    <Show when={render()}>
      <PanelLayout id={Pages.Configuration}>
        <Panel>
          <TabList onCreateTab={(key) => createTab(key)}>
            <ConfigTabContent />
          </TabList>
        </Panel>
      </PanelLayout>
      <ConnectButton
        style={{ position: "absolute", top: "4rem", right: "1rem" }}
      />
    </Show>
  );
}

export default Configuration;
