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
import { createEffect, createSignal, For, on, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { load } from "@tauri-apps/plugin-store";
import { IconButton } from "~/components/ui/icon-button.tsx";
import { IconChevronRight, IconPlus } from "@tabler/icons-solidjs";
import { Dynamic, Portal } from "solid-js/web";
import { Menu } from "~/components/ui/menu.tsx";
import { detectPort, getConfigFromPort, Port } from "~/services/PortService.ts";
import { ConfigType } from "src-tauri/generated/config/ConfigType.tsx";
import { Text } from "~/components/ui/text.tsx";
import { toaster } from "~/services/Toaster.ts";

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
      createNewFile(panelStoreKey, configFormFileFormat(), "New File");
    }
    setRender(true);
  });

  const createNewFile = (key: string, form: ConfigType, formName: string) => {
    setRender(false);
    const id = crypto.randomUUID();
    const accordionStatuses: AccordionStates = new Map();
    const linkedStatuses: LinkStates = new Map();
    const gainLockStatuses: GainLockStates = new Map();
    const formOverflowY: Map<string, number> = new Map();
    const newForm = JSON.parse(JSON.stringify(form));
    const newTab = {
      tab: {
        id: id,
        tabName: formName,
      },
      tabPage: {
        configTabPage: {
          filePath: "",
          portId: "",
          configForm: newForm,
          configAccordionStatuses: accordionStatuses,
          configLinkedStatuses: linkedStatuses,
          configGainLockStatuses: gainLockStatuses,
          originalFile: JSON.parse(JSON.stringify(form)),
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
  const [ports, setPorts] = createSignal<Port[]>([]);

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
                      onClick={async (e) => {
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

                        const ports = await detectPort();
                        setPorts(ports);
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
                              createNewFile(
                                tabStoreKey(),
                                configFormFileFormat(),
                                "New File",
                              );
                            }
                          }}
                        >
                          {"New file"}
                        </Menu.Item>
                        <Menu.Separator />
                        <Menu.Item value={"Open file"}>
                          {"Open file..."}
                        </Menu.Item>
                        <Show when={recentConfigFilePaths().length > 0}>
                          <Menu.Root positioning={{ placement: "right-end" }}>
                            <Menu.TriggerItem>
                              {"Open recent files..."}
                              <IconChevronRight />
                            </Menu.TriggerItem>
                            <Portal>
                              <Menu.Positioner>
                                <Menu.Content>
                                  <For each={recentConfigFilePaths()}>
                                    {(filePath) => {
                                      return (
                                        <Menu.Item value={filePath}>
                                          {filePath}
                                        </Menu.Item>
                                      );
                                    }}
                                  </For>
                                </Menu.Content>
                              </Menu.Positioner>
                            </Portal>
                          </Menu.Root>
                        </Show>
                        <Menu.Separator />

                        <Show
                          when={ports().length > 1}
                          fallback={
                            <Menu.Item
                              value={"Get from port"}
                              disabled={ports().length === 0}
                              onClick={async () => {
                                if (ports().length === 0) return;
                                try {
                                  const config = await getConfigFromPort(
                                    ports()[0].id,
                                  );
                                  createNewFile(
                                    tabStoreKey(),
                                    config,
                                    ports()[0].id,
                                  );
                                } catch (e) {
                                  toaster.create({
                                    title: "Communication Error",
                                    description: e as string,
                                    type: "error",
                                  });
                                }
                              }}
                            >
                              {"Get from port"}
                            </Menu.Item>
                          }
                        >
                          <Menu.Root positioning={{ placement: "right-end" }}>
                            <Menu.TriggerItem>
                              {"Get from port"}
                              <IconChevronRight />
                            </Menu.TriggerItem>
                            <Portal>
                              <Menu.Positioner>
                                <Menu.Content>
                                  <For each={ports()}>
                                    {(port) => {
                                      const portId = port.id;
                                      const version = port.version;
                                      return (
                                        <Menu.Item
                                          value={portId}
                                          onClick={async () => {
                                            if (portId.length === 0) return;
                                            try {
                                              const config =
                                                await getConfigFromPort(portId);
                                              createNewFile(
                                                tabStoreKey(),
                                                config,
                                                portId,
                                              );
                                            } catch (e) {
                                              toaster.create({
                                                title: "Communication Error",
                                                description: e as string,
                                                type: "error",
                                              });
                                            }
                                          }}
                                          style={{
                                            "flex-direction": "column",
                                          }}
                                        >
                                          <Text size="sm" width="100%">
                                            {portId}
                                          </Text>
                                          <Text
                                            fontWeight={"light"}
                                            size="xs"
                                            width="100%"
                                          >
                                            {version}
                                          </Text>
                                        </Menu.Item>
                                      );
                                    }}
                                  </For>
                                </Menu.Content>
                              </Menu.Positioner>
                            </Portal>
                          </Menu.Root>
                        </Show>
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
