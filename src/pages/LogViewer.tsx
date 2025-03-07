import { Stack } from "styled-system/jsx";
import { Splitter } from "~/components/ui/splitter";
import { createEffect, createSignal, For, onMount, Show } from "solid-js";
import { LogViewerTabList } from "./LogViewer/LogViewerTabList";
import { open } from "@tauri-apps/plugin-dialog";
import { Toast } from "~/components/ui/toast";
import { IconX } from "@tabler/icons-solidjs";
import {
  logViewPanelContexts,
  logViewPanelSize,
  setLogViewPanelContexts,
  setLogViewPanelContexts as setLogViewPanel,
  setLogViewPanelSize,
  TabContext,
} from "~/GlobalState";

function LogViewer() {
  onMount(() => {
    if (logViewPanelContexts().length === 0) {
      const uuid = getCryptoUUID();
      setLogViewPanel([{ id: uuid, tabContext: [], focusedTab: undefined }]);
      setLogViewPanelSize([{ id: uuid, size: 100 }]);
    }
  });

  // If tab list length is 0, then the panel will close automatically
  createEffect(() => {
    const tabList = logViewPanelContexts();
    if (tabList.length === 1) return;

    let parseList = tabList;
    const zeroTabList = tabList.filter((tab) => tab.tabContext.length === 0);
    if (zeroTabList.length !== 0) {
      zeroTabList.forEach((deletedTab) => {
        parseList = parseList.filter((tab) => tab.id !== deletedTab.id);
      });
      setLogViewPanel(parseList);
    }

    if (parseList.length !== logViewPanelSize().length) {
      setLogViewPanelSize(() => {
        const panelSize = 100 / parseList.length;
        const updateList = parseList.map((panel) => {
          return { id: panel.id, size: panelSize };
        });
        return updateList;
      });
    }
  });

  const [draggedTabInfo, setDraggedTabInfo] = createSignal<TabContext>(
    {} as TabContext,
  );
  const [draggedTabPanelIndex, setDraggedTabPanelIndex] = createSignal<number>(
    0,
  );

  // Move existing tab to create new tab panel.
  const moveTabOnSplitter = (index: number) => {
    const panelIndex = index + 1;
    const uuid = getCryptoUUID();

    setLogViewPanel((prev) => {
      const updateList = [...prev].map((tabPanel, i) => {
        if (i === index) {
          return {
            id: tabPanel.id,
            tabContext: tabPanel.tabContext.filter((tab) =>
              tab.id !== draggedTabInfo().id
            ),
            focusedTab: tabPanel.focusedTab,
          };
        } else return tabPanel;
      });
      const newTabPanel = {
        id: uuid,
        tabContext: [draggedTabInfo()],
        focusedTab: undefined,
      };
      const addNewTabPanel = [
        ...updateList.slice(0, panelIndex),
        newTabPanel,
        ...updateList.slice(panelIndex),
      ];
      return addNewTabPanel;
    });
  };

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  async function openFileDialog(): Promise<
    { id: string; filePath: string } | undefined
  > {
    const path = await open({
      multiple: false,
      filters: [
        { name: "CSV", extensions: ["csv"] },
      ],
    });

    if (!path) {
      return undefined;
    }

    const extensions = path.slice(path.length - 4, path.length);
    if (extensions !== ".csv") {
      return undefined;
    }

    const tabId = getCryptoUUID();
    return { id: tabId, filePath: path.replaceAll("\\", "/") };
  }

  // Signal for showing the splitter, When tab is dragging.
  const [isDragging, setIsDragging] = createSignal<
    [boolean, string | undefined]
  >([
    false,
    undefined,
  ]);

  function getCryptoUUID(): string {
    const uuid: string = crypto.randomUUID();
    return uuid;
  }

  return (
    <>
      <div
        style={{ "overflow-y": "hidden", width: `100%`, height: "100%" }}
      >
        <Toast.Toaster toaster={toaster}>
          {(toast) => (
            <Toast.Root>
              <Toast.Title>{toast().title}</Toast.Title>
              <Toast.Description>{toast().description}</Toast.Description>
              <Toast.CloseTrigger>
                <IconX />
              </Toast.CloseTrigger>
            </Toast.Root>
          )}
        </Toast.Toaster>
        <Splitter.Root
          size={logViewPanelSize()}
          gap="0.5"
        >
          <For each={logViewPanelSize() && logViewPanelContexts()}>
            {(currentPanel, index) => (
              <>
                <Show when={index() !== 0}>
                  <Splitter.ResizeTrigger
                    id={`${
                      logViewPanelSize()[index() - 1].id
                    }:${currentPanel.id}`}
                    width="4px"
                    padding="0"
                    opacity="0%"
                    transition="opacity 0.3s ease"
                    onMouseEnter={(e) => e.currentTarget.style.opacity = "100%"}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = "0%"}
                  />
                </Show>
                <Splitter.Panel
                  id={currentPanel.id}
                  width="100%"
                  height="100%"
                >
                  <div
                    style={{
                      width: "100%",
                      "height": `100%`,
                    }}
                  >
                    <LogViewerTabList
                      id={currentPanel.id}
                      style={{
                        "width": "100%",
                        "height": "100%",
                      }}
                      tabList={currentPanel.tabContext}
                      focusedTab={currentPanel.focusedTab}
                      onCreateTab={async () => {
                        const newTabInfo = await openFileDialog();
                        if (!newTabInfo) {
                          toaster.create({
                            title: "Ivalid File",
                            description: "The file is invalid.",
                            type: "error",
                          });
                          return;
                        }
                        const newTab: TabContext = {
                          id: newTabInfo.id,
                          filePath: newTabInfo.filePath,
                          plotSplitIndex: [],
                          plotContext: [],
                          tabName: "",
                          plotZoomState: [0, 0],
                        };
                        setLogViewPanel((prev) => {
                          return [...prev].map((panel, i) => {
                            if (i === index()) {
                              return {
                                id: panel.id,
                                tabContext: [...panel.tabContext, newTab],
                                focusedTab: newTabInfo.id,
                              };
                            } else return panel;
                          });
                        });
                      }}
                      onDeleteTab={(deleteTabId, i) => {
                        const focusTabIndex =
                          i === currentPanel.tabContext.length - 1 ? i - 1 : i;
                        setLogViewPanel((prev) => {
                          return [...prev].map((panel, i) => {
                            if (i === index()) {
                              return {
                                id: panel.id,
                                tabContext: panel.tabContext.filter((tab) =>
                                  tab.id !== deleteTabId
                                ),
                                focusedTab: panel.tabContext[focusTabIndex].id,
                              };
                            } else return panel;
                          });
                        });
                      }}
                      onDraggedTabInfo={(tabContext) => {
                        setDraggedTabInfo(tabContext);
                        setDraggedTabPanelIndex(index());
                      }}
                      onTabDrop={() => {
                        if (draggedTabPanelIndex() === index()) return;
                        setLogViewPanel((prev) => {
                          return [...prev].map((tabPanel, i) => {
                            if (index() === i) {
                              return {
                                id: tabPanel.id,
                                tabContext: [
                                  ...tabPanel.tabContext,
                                  draggedTabInfo(),
                                ],
                                focusedTab: tabPanel.focusedTab,
                              };
                            } else if (i === draggedTabPanelIndex()) {
                              return {
                                id: tabPanel.id,
                                tabContext: [
                                  ...tabPanel.tabContext.filter((ctx) => {
                                    return ctx.id !== draggedTabInfo().id;
                                  }),
                                ],
                                focusedTab: undefined,
                              };
                            } else return tabPanel;
                          });
                        });
                      }}
                      onTabContextDrag={(isTabContextDragEnter) => {
                        const panelId = isTabContextDragEnter
                          ? currentPanel.id
                          : undefined;
                        setIsDragging([isTabContextDragEnter, panelId]);
                      }}
                      onTabContextChange={(updatedTab: TabContext) => {
                        setLogViewPanel((prev) => {
                          const updatePanels = [...prev];
                          updatePanels[index()].tabContext =
                            updatePanels[index()].tabContext.map((tab) => {
                              if (tab.id === updatedTab.id) return updatedTab;
                              else return tab;
                            });
                          return updatePanels;
                        });
                      }}
                      onTabFocus={(currentfocusTabId) => {
                        setLogViewPanelContexts((prev) => {
                          const updateTabList = [...prev];
                          updateTabList[index()].focusedTab = currentfocusTabId;
                          return updateTabList;
                        });
                      }}
                    />
                  </div>
                  <Show
                    when={isDragging()[0] &&
                      isDragging()[1] === currentPanel.id &&
                      currentPanel.tabContext.length > 1}
                  >
                    <Stack
                      backgroundColor="bg.muted"
                      style={{
                        width: "50%",
                        height: "100%",
                        "margin-top": "6rem",
                        opacity: "30%",
                      }}
                      onDragEnter={(e) =>
                        e.currentTarget.style.opacity = "100%"}
                      onDragLeave={(e) => e.currentTarget.style.opacity = "50%"}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        setIsDragging([false, undefined]);
                        moveTabOnSplitter(index());
                      }}
                    >
                    </Stack>
                  </Show>
                </Splitter.Panel>
              </>
            )}
          </For>
        </Splitter.Root>
      </div>
    </>
  );
}

export default LogViewer;
