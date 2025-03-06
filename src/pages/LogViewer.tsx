import { Stack } from "styled-system/jsx";
import { Splitter } from "~/components/ui/splitter";
import { createEffect, createSignal, For, onMount, Show } from "solid-js";
import { LogViewerTabList } from "./LogViewer/LogViewerTabList";
import { open } from "@tauri-apps/plugin-dialog";
import { Toast } from "~/components/ui/toast";
import { IconX } from "@tabler/icons-solidjs";
import {
  logViewTabPanel,
  setLogViewTabPanel as setLogViewPanel,
  setSplitterList,
  splitterList,
  TabContext,
} from "~/GlobalState";

function LogViewer() {
  onMount(() => {
    if (logViewTabPanel().length === 0) {
      const uuid = getCryptoUUID();
      setLogViewPanel([{ id: uuid, tabContext: [], focusedTab: undefined }]);
      setSplitterList([{ id: uuid, size: 100 }]);
    }
  });

  // If tab list length is 0, then the panel will close automatically
  createEffect(() => {
    const tabList = logViewTabPanel();
    if (tabList.length === 1) return;

    let parseList = tabList;
    const zeroTabList = tabList.filter((tab) => tab.tabContext.length === 0);
    if (zeroTabList.length !== 0) {
      zeroTabList.forEach((deletedTab) => {
        parseList = parseList.filter((tab) => tab.id !== deletedTab.id);
      });
      setLogViewPanel(parseList);
    }

    if (parseList.length !== splitterList().length) {
      setSplitterList(() => {
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
  const [draggedTabPanelId, setDraggedTabPanelId] = createSignal<string>(
    "",
  ); // tab splitter id

  const dropTabOnPanel = (index: number) => {
    const panelIndex = index + 1;
    const uuid = getCryptoUUID();

    setLogViewPanel((prev) => {
      // Tab copy error came out
      const updateList = [...prev].map((item, i) => {
        if (i === index) {
          return {
            id: item.id,
            tabContext: item.tabContext.filter((item) =>
              item.id !== draggedTabInfo().id
            ),
            focusedTab: item.focusedTab,
          };
        } else return item;
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

  const [isDragging, setIsDragging] = createSignal<[boolean, number | null]>([
    false,
    null,
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
          size={splitterList()}
          gap="0.5"
          onSizeChangeEnd={(panel) => {
            const parseToPanelSize: {
              id: string;
              size: number;
            }[] = panel.size.map((panel) => {
              return { id: panel.id.toString(), size: Number(panel.size) };
            });
            setSplitterList(parseToPanelSize);
          }}
        >
          <For each={splitterList() && logViewTabPanel()}>
            {(item, index) => (
              <>
                <Show when={index() !== 0}>
                  <Splitter.ResizeTrigger
                    id={`${splitterList()[index() - 1].id}:${item.id}`}
                    width="4px"
                    padding="0"
                    opacity="0%"
                    transition="opacity 0.3s ease"
                    onMouseEnter={(e) => e.currentTarget.style.opacity = "100%"}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = "0%"}
                  />
                </Show>
                <Splitter.Panel
                  id={item.id}
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
                      id={item.id}
                      style={{
                        "width": "100%",
                        "height": "100%",
                      }}
                      tabList={item.tabContext}
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
                          const updateList: typeof prev = [...prev].map(
                            (item, i) => {
                              if (i === index()) {
                                return {
                                  id: item.id,
                                  tabContext: [...item.tabContext, newTab],
                                  focusedTab: item.focusedTab,
                                };
                              } else return item;
                            },
                          );
                          return updateList;
                        });
                      }}
                      onDeleteTab={(deleteTabId) => {
                        setLogViewPanel((prev) => {
                          const updateList = [...prev].map((item, i) => {
                            if (i === index()) {
                              return {
                                id: item.id,
                                tabContext: [
                                  ...item.tabContext.filter((tab) =>
                                    tab.id !== deleteTabId
                                  ),
                                ],
                                focusedTab: item.focusedTab,
                              };
                            } else return item;
                          });
                          return updateList;
                        });
                      }}
                      onDraggedTabInfo={(tabContext, PanelId) => {
                        setDraggedTabInfo(tabContext);
                        setDraggedTabPanelId(PanelId);
                      }}
                      onTabDrop={() => {
                        if (draggedTabPanelId() === item.id) return;
                        setLogViewPanel((prev) => {
                          const updateList: typeof prev = [...prev].map(
                            (item, i) => {
                              if (index() === i) {
                                const parseDraggedTabInfo: TabContext =
                                  draggedTabInfo();
                                return {
                                  id: item.id,
                                  tabContext: [
                                    ...item.tabContext,
                                    parseDraggedTabInfo,
                                  ],
                                  focusedTab: item.focusedTab,
                                };
                              } else if (item.id === draggedTabPanelId()) {
                                return {
                                  id: item.id,
                                  tabContext: [
                                    ...item.tabContext.filter((ctx) => {
                                      return ctx.id !== draggedTabInfo().id;
                                    }),
                                  ],
                                  focusedTab: undefined,
                                };
                              } else return item;
                            },
                          );
                          return updateList;
                        });
                      }}
                      onPlotContextChange={(updateTabId, changedCtx) => {
                        setLogViewPanel((prev) => {
                          const updatePanel = [...prev];
                          updatePanel[index()].tabContext = updatePanel[index()]
                            .tabContext.map((tabCtx) => {
                              if (tabCtx.id === updateTabId) {
                                return {
                                  id: tabCtx.id,
                                  filePath: tabCtx.filePath,
                                  plotContext: changedCtx,
                                  plotSplitIndex: tabCtx.plotSplitIndex,
                                  tabName: tabCtx.tabName,
                                  plotZoomState: tabCtx.plotZoomState,
                                } as TabContext;
                              } else return tabCtx;
                            });
                          return updatePanel;
                        });
                      }}
                      onPlotSplit={(updateTabId, plotSplitIndex) => {
                        setLogViewPanel((prev) => {
                          const updatePanel = [...prev];
                          updatePanel[index()].tabContext = updatePanel[index()]
                            .tabContext.map((tabCtx) => {
                              if (tabCtx.id === updateTabId) {
                                return {
                                  id: tabCtx.id,
                                  filePath: tabCtx.filePath,
                                  plotContext: tabCtx.plotContext,
                                  plotSplitIndex: plotSplitIndex,
                                  tabName: tabCtx.tabName,
                                  plotZoomState: tabCtx.plotZoomState,
                                } as TabContext;
                              } else return tabCtx;
                            });
                          return updatePanel;
                        });
                      }}
                      onTabNameChange={(updateTabId, changedName) => {
                        setLogViewPanel((prev) => {
                          const updatePanel = [...prev];
                          updatePanel[index()].tabContext = updatePanel[index()]
                            .tabContext.map((tabCtx) => {
                              if (tabCtx.id === updateTabId) {
                                return {
                                  id: tabCtx.id,
                                  filePath: tabCtx.filePath,
                                  plotContext: tabCtx.plotContext,
                                  plotSplitIndex: tabCtx.plotSplitIndex,
                                  tabName: changedName,
                                  plotZoomState: tabCtx.plotZoomState,
                                } as TabContext;
                              } else return tabCtx;
                            });
                          return updatePanel;
                        });
                      }}
                      onTabContextDrag={(isTabContextDragEnter) => {
                        const tabListIndex = isTabContextDragEnter
                          ? index()
                          : null;
                        setIsDragging([isTabContextDragEnter, tabListIndex]);
                        console.log(isDragging());
                      }}
                      onXRangeChange={(updateTabId, changedXRange) => {
                        setLogViewPanel((prev) => {
                          const updatePanel = [...prev];
                          updatePanel[index()].tabContext = updatePanel[index()]
                            .tabContext.map((tabCtx) => {
                              if (tabCtx.id === updateTabId) {
                                return {
                                  id: tabCtx.id,
                                  filePath: tabCtx.filePath,
                                  plotContext: tabCtx.plotContext,
                                  plotSplitIndex: tabCtx.plotSplitIndex,
                                  tabName: tabCtx.tabName,
                                  plotZoomState: changedXRange,
                                } as TabContext;
                              } else return tabCtx;
                            });
                          return updatePanel;
                        });
                      }}
                      /*onTabFocus={(currentfocusTabId) => {
                        setLogViewTabList((prev) => {
                          const updateTabList: typeof prev = prev.map(
                            (tab, i) => {
                              if (i === index()) {
                                return {
                                  id: tab.id,
                                  tabs: [...tab.tabContext],
                                  focusedTab: currentfocusTabId,
                                };
                              } else {
                                return tab;
                              }
                            },
                          );
                          return updateTabList;
                        });
                      }}*/
                    />
                  </div>
                  <Show
                    when={isDragging()[0] && isDragging()[1] === index() &&
                      item.tabContext.length > 1}
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
                        setIsDragging([false, null]);
                        dropTabOnPanel(index());
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
// 563
