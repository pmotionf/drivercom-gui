import { Splitter } from "~/components/ui/splitter.tsx";
import { createEffect, createSignal, For, onMount, Show } from "solid-js";
import { LogViewerTabList } from "./LogViewer/LogViewerTabList.tsx";
import { open } from "@tauri-apps/plugin-dialog";
import { Toast } from "~/components/ui/toast.tsx";
import { IconX } from "@tabler/icons-solidjs";
import {
  logViewerPanelContexts,
  logViewerPanelSize,
  setLogViewPanelContexts,
  setLogViewPanelSize,
} from "~/GlobalState.ts";
import { Spinner } from "~/components/ui/spinner.tsx";
import { PlotContext } from "~/components/Plot.tsx";
//@ts-ignore test
import { Stack } from "styled-system/jsx/index.mjs";

type PanelId = string | number;
interface PanelSizeData {
  id: PanelId;
  size?: number | undefined;
  minSize?: number | undefined;
  maxSize?: number | undefined;
}
interface SizeChangeDetails {
  size: PanelSizeData[];
  activeHandleId: string | null;
}

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
  const [tabDraggedInPanelIndex, setTabDrggaedInPanelIndex] = createSignal<
    number
  >(0);

  // Move existing tab to create new tab panel.
  const moveTabOnSplitter = (index: number, direction: string) => {
    const panelIndex = direction === "rightSplitter" ? index + 1 : index;
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

  const [isDragging, setIsDragging] = createSignal<boolean>(false);
  const [tabDraggedOutPanelIndex, setTabDraggedOutPanelIndex] = createSignal<
    number
  >(0);

  return (
    <>
      <div style={{ "overflow-y": "hidden", width: `100%`, height: "100%" }}>
        <Toast.Toaster toaster={toaster}>
          {(
            //@ts-ignore Should change not to use ts-ignore
            toast,
          ) => (
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
            onSizeChange={(details: SizeChangeDetails) => {
              const parseSizeData = details.size.map((info) => {
                return { id: info.id.toString(), size: Number(info.size) };
              });
              setLogViewPanelSize(parseSizeData);
            }}
          >
            <For each={logViewerPanelSize() && logViewerPanelContexts()}>
              {(currentPanel, index) => (
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
                        //@ts-ignore Should change not to use ts-ignore
                        e,
                      ) => (e.currentTarget.style.opacity = "100%")}
                      onMouseLeave={(
                        //@ts-ignore Should change not to use ts-ignore
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
                      onMouseEnter={() => {
                        if (!isDragging()) return;
                        setTabDrggaedInPanelIndex(index());
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
                        onTabDrag={(tabContext) => {
                          setDraggedTabInfo(tabContext);
                          setTabDrggaedInPanelIndex(index());
                          setTabDraggedOutPanelIndex(index());
                          setIsDragging(true);
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
                            const updateTabList = [...prev].map((panel, i) => {
                              if (index() === i) {
                                return {
                                  ...panel,
                                  focusedTab: currentfocusTabId,
                                };
                              } else return panel;
                            });
                            return updateTabList;
                          });
                        }}
                        onTabReorder={(reorderTab) => {
                          setLogViewPanelContexts((prev) => {
                            const updateTabList = [...prev].map((panel, i) => {
                              if (index() === i) {
                                return {
                                  ...panel,
                                  tabContext: reorderTab,
                                };
                              } else return panel;
                            });
                            return updateTabList;
                          });
                        }}
                        onTabDragEnd={(draggingTabLocation) => {
                          setIsDragging(false);

                          if (
                            draggingTabLocation === "leftSplitter" ||
                            draggingTabLocation === "rightSplitter"
                          ) {
                            moveTabOnSplitter(index(), draggingTabLocation);
                          }

                          if (draggingTabLocation === "otherPanel") {
                            if (index() === tabDraggedInPanelIndex()) {
                              return;
                            }
                            setLogViewPanelContexts((prev) => {
                              return prev.map((tabPanel, i) => {
                                if (i === tabDraggedInPanelIndex()) {
                                  return {
                                    ...tabPanel,
                                    tabContext: [
                                      ...tabPanel.tabContext,
                                      draggedTabInfo(),
                                    ],
                                    focusedTab: draggedTabInfo().id,
                                  };
                                } else if (i === index()) {
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
                          }
                        }}
                      />
                      <Show when={isDragging()}>
                        <Stack
                          style={{
                            width: `${
                              document.getElementById(currentPanel.id)!
                                .clientWidth
                            }px`,
                            "pointer-events": "none",
                            opacity: tabDraggedInPanelIndex() !==
                                tabDraggedOutPanelIndex()
                              ? tabDraggedInPanelIndex() === index()
                                ? "10%"
                                : tabDraggedOutPanelIndex() === index()
                                ? "10%"
                                : "0%"
                              : "0%",
                          }}
                          height="100%"
                          position="absolute"
                          top="0"
                          backgroundColor="fg.default"
                        />
                      </Show>
                    </div>
                  </Splitter.Panel>
                </>
              )}
            </For>
          </Splitter.Root>
        </Show>
      </div>
    </>
  );
}

export default LogViewer;
