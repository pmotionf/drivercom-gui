import { Stack } from "styled-system/jsx";
import { Splitter } from "~/components/ui/splitter";
import { createEffect, createSignal, For, onMount, Show } from "solid-js";
import { LogViewerTabList } from "./LogViewer/LogViewerTabList";
import { open } from "@tauri-apps/plugin-dialog";
import { Toast } from "~/components/ui/toast";
import { IconX } from "@tabler/icons-solidjs";
import {
  logViewerPanelContexts,
  logViewerPanelSize,
  setLogViewPanelContexts,
  setLogViewPanelSize,
} from "~/GlobalState";
import { Spinner } from "~/components/ui/spinner";
import { PlotContext } from "~/components/Plot";

export type LogViewerTabContext = {
  id: string;
  filePath: string;
  plotSplitIndex: number[][];
  plotContext: PlotContext[];
  tabName: string;
  plotZoomState: [number, number];
};

export type LogViewerPanelContext = {
  id: string;
  size: number;
};

function LogViewer() {
  const [render, setRender] = createSignal<boolean>(true);

  onMount(() => {
    if (logViewerPanelContexts().length === 0) {
      const uuid = getCryptoUUID();
      setLogViewPanelContexts([
        {
          id: uuid,
          tabContext: [],
        },
      ]);
      setLogViewPanelSize([{ id: uuid, size: 100 }]);
    }
  });

  // If tab list length is 0, then the panel will close automatically
  // Use async fuction to rerender the splitter after size is updated.
  // If it dosent use await then size error is occur.
  createEffect(async () => {
    const tabList = logViewerPanelContexts();
    if (tabList.length === 1) return;

    let parseList = tabList;
    const zeroTabList = tabList.filter((tab) => tab.tabContext.length === 0);
    if (zeroTabList.length !== 0) {
      zeroTabList.forEach((deletedTab) => {
        parseList = parseList.filter((tab) => tab.id !== deletedTab.id);
      });
    }
    setRender(false);

    setLogViewPanelContexts(parseList);

    if (parseList.length !== logViewerPanelSize().length) {
      await setLogViewPanelSize(() => {
        const panelSize = 100 / parseList.length;
        const updatePanelSize = parseList.map((panel) => {
          return { id: panel.id, size: panelSize };
        });
        return updatePanelSize;
      });
    }

    await setRender(true);
  });

  const [draggedTabInfo, setDraggedTabInfo] = createSignal<LogViewerTabContext>(
    {} as LogViewerTabContext,
  );
  const [draggedTabPanelIndex, setDraggedTabPanelIndex] = createSignal<number>(
    0,
  );

  // Move existing tab to create new tab panel.
  const moveTabOnSplitter = (index: number) => {
    const panelIndex = index + 1;
    const uuid = getCryptoUUID();

    setLogViewPanelContexts((prev) => {
      const updateList = [...prev].map((tabPanel, i) => {
        if (i === index) {
          const parseTabContext = tabPanel.tabContext.filter(
            (tab) => tab.id !== draggedTabInfo().id,
          );
          return {
            id: tabPanel.id,
            tabContext: [...parseTabContext],
            focusedTab: parseTabContext[parseTabContext.length - 1].id,
          };
        } else return tabPanel;
      });
      const newTabPanel = {
        id: uuid,
        tabContext: [draggedTabInfo()],
        focusedTab: draggedTabInfo().id,
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
    {
      id: string;
      filePath: string;
    } | null
  > {
    const path = await open({
      multiple: false,
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });

    if (!path) {
      return null;
    }

    const extensions = path.slice(path.length - 4, path.length);
    if (extensions !== ".csv") {
      return null;
    }

    const tabId = getCryptoUUID();
    return { id: tabId, filePath: path.replaceAll("\\", "/") };
  }

  function getCryptoUUID(): string {
    const uuid: string = crypto.randomUUID();
    return uuid;
  }

  // Signal for showing the splitter, When tab is dragging.
  const [isDragging, setIsDragging] = createSignal<string>("");

  const [isTabEnterSplitter, setIsTabEnterSplitter] = createSignal<boolean>(
    false,
  );

  return (
    <>
      <div style={{ "overflow-y": "hidden", width: `100%`, height: "100%" }}>
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
        <Show when={render()} fallback={<Spinner />}>
          <Splitter.Root
            size={logViewerPanelSize()}
            gap="0.5"
            onSizeChange={(value) => {
              const parseSizeData = value.size.map((info) => {
                return { id: info.id.toString(), size: Number(info.size) };
              });
              setLogViewPanelSize(parseSizeData);
            }}
          >
            <For each={logViewerPanelSize() && logViewerPanelContexts()}>
              {(currentPanel, index) => {
                //const divElement = document.getElementById(currentPanel.id)
                //const divElementOffsetWidth = divElement?.clientWidth
                return (
                  <>
                    <Show when={index() !== 0}>
                      <Splitter.ResizeTrigger
                        id={`${
                          logViewerPanelContexts()[index() - 1].id
                        }:${currentPanel.id}`}
                        width="4px"
                        padding="0"
                        opacity="0%"
                        transition="opacity 0.3s ease"
                        onMouseEnter={(
                          e,
                        ) => (e.currentTarget.style.opacity = "100%")}
                        onMouseLeave={(
                          e,
                        ) => (e.currentTarget.style.opacity = "0%")}
                      />
                    </Show>
                    <Splitter.Panel
                      id={currentPanel.id}
                      width="100%"
                      height="100%"
                    >
                      <div
                        id={currentPanel.id}
                        style={{
                          width: "100%",
                          height: `100%`,
                          position: "relative",
                        }}
                      >
                        <LogViewerTabList
                          id={currentPanel.id}
                          style={{
                            width: "100%",
                            height: "100%",
                          }}
                          tabList={currentPanel.tabContext}
                          focusedTab={currentPanel.focusedTab}
                          onCreateTab={async () => {
                            const newTabInfo = await openFileDialog();
                            if (!newTabInfo) {
                              toaster.create({
                                title: "Invalid File",
                                description: "The file is invalid.",
                                type: "error",
                              });
                              return;
                            }
                            const newTab: LogViewerTabContext = {
                              id: newTabInfo.id,
                              filePath: newTabInfo.filePath,
                              plotSplitIndex: [],
                              plotContext: [],
                              tabName: "",
                              plotZoomState: [0, 0],
                            };
                            setLogViewPanelContexts((prev) => {
                              return prev.map((panel, i) => {
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
                          onDeleteTab={(deleteTabId, deleteTabIdIndex) => {
                            const updatedTabContext: LogViewerTabContext[] =
                              currentPanel.tabContext.filter(
                                (tab) => tab.id !== deleteTabId,
                              );
                            const nextFocusTabIndex: number =
                              deleteTabIdIndex === 0
                                ? 1
                                : deleteTabIdIndex - 1;
                            const prevFocusTabIndex: number = updatedTabContext
                              .map((tab) => tab.id)
                              .indexOf(currentPanel.focusedTab!);

                            setTimeout(() => {
                              setLogViewPanelContexts((prev) => {
                                const updateList = [...prev].map((tab, i) => {
                                  if (i === index()) {
                                    return {
                                      ...tab,
                                      tabContext: updatedTabContext,
                                      focusedTab: updatedTabContext.length !== 0
                                        ? currentPanel.focusedTab ===
                                            deleteTabId
                                          ? currentPanel.tabContext[
                                            nextFocusTabIndex
                                          ].id
                                          : updatedTabContext[prevFocusTabIndex]
                                            .id
                                        : undefined,
                                    };
                                  }
                                  return tab;
                                });
                                return updateList;
                              });
                            }, 200);
                          }}
                          onDraggedTabInfo={(tabContext) => {
                            setDraggedTabInfo(tabContext);
                            setDraggedTabPanelIndex(index());
                          }}
                          onTabDrop={() => {
                            if (draggedTabPanelIndex() === index()) return;
                            setLogViewPanelContexts((prev) => {
                              return prev.map((tabPanel, i) => {
                                if (i === index()) {
                                  return {
                                    ...tabPanel,
                                    tabContext: [
                                      ...tabPanel.tabContext,
                                      draggedTabInfo(),
                                    ],
                                    focusedTab: draggedTabInfo().id,
                                  };
                                } else if (i === draggedTabPanelIndex()) {
                                  const newTabContext = tabPanel.tabContext
                                    .filter(
                                      (ctx) => ctx.id !== draggedTabInfo().id,
                                    );
                                  return {
                                    id: tabPanel.id,
                                    tabContext: newTabContext,
                                    ...(newTabContext.length > 0 && {
                                      focusedTab:
                                        newTabContext[newTabContext.length - 1]
                                          .id,
                                    }),
                                  };
                                }
                                return tabPanel;
                              });
                            });
                          }}
                          onTabContextDrag={(isTabContextDragEnter) => {
                            isTabContextDragEnter
                              ? setIsDragging(currentPanel.id)
                              : setIsDragging("");
                          }}
                          onTabContextChange={(
                            updatedTab: LogViewerTabContext,
                          ) => {
                            setLogViewPanelContexts((prev) => {
                              const updatePanels = [...prev];
                              updatePanels[index()].tabContext = updatePanels[
                                index()
                              ].tabContext.map((tab) => {
                                if (tab.id === updatedTab.id) return updatedTab;
                                return tab;
                              });
                              return updatePanels;
                            });
                          }}
                          onTabFocus={(currentfocusTabId) => {
                            setLogViewPanelContexts((prev) => {
                              const updateTabList = [...prev].map(
                                (panel, i) => {
                                  if (index() === i) {
                                    return {
                                      ...panel,
                                      focusedTab: currentfocusTabId,
                                    };
                                  } else return panel;
                                },
                              );
                              return updateTabList;
                            });
                          }}
                          onTabReorder={(reorderTab) => {
                            setLogViewPanelContexts((prev) => {
                              const updateTabList = [...prev].map(
                                (panel, i) => {
                                  if (index() === i) {
                                    return {
                                      ...panel,
                                      tabContext: reorderTab,
                                    };
                                  } else return panel;
                                },
                              );
                              return updateTabList;
                            });
                          }}
                          onTabDragEnd={() => {
                            if (
                              isTabEnterSplitter() &&
                              currentPanel.tabContext.length > 1
                            ) {
                              moveTabOnSplitter(index());
                            }
                            setIsDragging("");
                          }}
                        />
                        <Show
                          when={isDragging() === currentPanel.id &&
                            currentPanel.tabContext.length > 1}
                        >
                          <Stack
                            backgroundColor="fg.default"
                            style={{
                              width: `${
                                document.getElementById(currentPanel.id)!
                                  .clientWidth / 2
                              }px`,
                              height: `${
                                document.getElementById(currentPanel.id)!
                                  .clientHeight
                              }px`,
                              position: "absolute",
                              top: "3rem",
                              left: `${
                                document.getElementById(currentPanel.id)!
                                  .clientWidth / 2
                              }px`,
                              opacity: isTabEnterSplitter() ? "10%" : "5%",
                            }}
                            onMouseEnter={() => {
                              setIsTabEnterSplitter(true);
                            }}
                            onMouseLeave={() => {
                              setIsTabEnterSplitter(false);
                            }}
                          >
                          </Stack>
                        </Show>
                      </div>
                    </Splitter.Panel>
                  </>
                );
              }}
            </For>
          </Splitter.Root>
        </Show>
      </div>
    </>
  );
}

export default LogViewer;
