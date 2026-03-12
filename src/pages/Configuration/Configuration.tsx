import {
  configFormFileFormat,
  Pages,
  pageKeys,
  tabStore,
  panelStore,
  recentConfigFilePaths,
} from "~/store/GlobalState.ts";
import { Panel } from "~/components/Panel/Panel.tsx";
import {
  PanelLayout,
  PanelSizeContext,
} from "~/components/Panel/PanelLayout.tsx";
import {
  TabContext,
  TabList,
  TabListContext,
} from "~/components/Tab/TabList.tsx";
import { ConfigTabContent } from "./ConfigTabContent.tsx";
import {
  AccordionStates,
  GainLockStates,
  LinkStates,
} from "~/pages/Configuration/ConfigForm/ConfigForm.tsx";
import { createEffect, createSignal, on, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { load } from "@tauri-apps/plugin-store";
import { IconButton } from "~/components/ui/icon-button.tsx";
import { IconPlus } from "@tabler/icons-solidjs";
import { Dynamic, Portal } from "solid-js/web";
import { Menu } from "~/components/ui/menu.tsx";

function Configuration() {
  const [render, setRender] = createSignal<boolean>(false);

  onMount(() => {
    if (!pageKeys.has(Pages.Configuration)) {
      const newPanelKey = crypto.randomUUID();
      pageKeys.set(Pages.Configuration, newPanelKey);

      const panelStoreKey = crypto.randomUUID();
      panelStore.set(
        newPanelKey,
        createSignal<PanelSizeContext[]>([{ id: panelStoreKey, size: 100 }]),
      );
      tabStore.set(
        panelStoreKey,
        createStore<TabListContext>({ tabContext: [], focusedTab: "" }),
      );
      createNewFile(panelStoreKey);
    }
    setRender(true);
  });

  const createNewFile = (key: string) => {
    setRender(false);
    const id = crypto.randomUUID();
    const accordionStatuses: AccordionStates = new Map();
    const linkedStatuses: LinkStates = new Map();
    const gainLockStatuses: GainLockStates = new Map();
    const formOverflowY: Map<string, number> = new Map();
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
          formOverflowY: formOverflowY,
        },
      },
    } as TabContext;

    if (tabStore.has(key)) {
      const tabCtx = tabStore.get(key)!;
      tabCtx[1]("tabContext", tabCtx[0].tabContext.length, newTab);
      setTimeout(() => {
        tabCtx[1]("focusedTab", newTab.tab.id);
      });
    }
    setRender(true);
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

  const [tabStoreKey, setTabStoreKey] = createSignal<string>("");

  return (
    <>
      <Show when={render()}>
        <PanelLayout id={Pages.Configuration}>
          <Panel>
            <TabList
              createButton={
                <Menu.Root>
                  <Menu.Trigger>
                    <IconButton
                      size="xs"
                      variant={"ghost"}
                      onClick={(e) => {
                        const clientX = e.clientX;
                        const pageKey = pageKeys.get(Pages.Configuration)!;
                        const panels = panelStore.get(pageKey)![0]();
                        for (let i = 0; i < panels.length; i++) {
                          const currentPanelId = panels[i].id;
                          const element = document.getElementById(
                            `tabs:${currentPanelId}`,
                          );
                          if (element) {
                            const rect = element.getBoundingClientRect();
                            if (rect.x < clientX && clientX <= rect.right) {
                              setTabStoreKey(currentPanelId);
                              break;
                            }
                          }
                        }
                      }}
                    >
                      <Dynamic
                        style={{ width: "0.8rem", height: "0.8rem" }}
                        component={IconPlus}
                      />
                    </IconButton>
                  </Menu.Trigger>
                  <Portal>
                    <Menu.Positioner>
                      <Menu.Content>
                        <Menu.Item
                          value={"New file"}
                          onClick={() => {
                            if (tabStoreKey().length > 0) {
                              createNewFile(tabStoreKey());
                            }
                          }}
                        >
                          {"New file"}
                        </Menu.Item>
                        <Menu.Item value={"Get from file"}>
                          {"Get from file"}
                        </Menu.Item>
                        <Show when={recentConfigFilePaths().length > 0}>
                          <Menu.TriggerItem>
                            {"Open recent files..."}
                          </Menu.TriggerItem>
                        </Show>
                        <Menu.Item value={"Get from port"}>
                          {"Get from port"}
                        </Menu.Item>
                      </Menu.Content>
                    </Menu.Positioner>
                  </Portal>
                </Menu.Root>
              }
            >
              <ConfigTabContent />
            </TabList>
          </Panel>
        </PanelLayout>
      </Show>
    </>
  );
}

export default Configuration;
