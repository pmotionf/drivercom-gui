import { Stack } from "styled-system/jsx";
import { Splitter } from "~/components/ui/splitter";
import { createEffect, createSignal, For, onMount, Show } from "solid-js";
import { LogViewerTabList } from "./LogViewer/LogViewerTabList";
import { open } from "@tauri-apps/plugin-dialog";
import { Toast } from "~/components/ui/toast";
import { IconX } from "@tabler/icons-solidjs";
import { PlotContext } from "~/components/Plot";

function LogViewer() {
  const [logViewTabList, setLogViewTabList] = createSignal<
    {
      id: string;
      tabs: [
        string,
        string,
        number[][],
        PlotContext[],
        string,
        [number, number],
      ][];
    }[]
  >([]);
  const [splitterList, setSplitterList] = createSignal<
    { id: string; size: number }[]
  >([]);

  onMount(() => {
    const uuid = getCryptoUUID();
    setLogViewTabList([{ id: uuid, tabs: [] }]);
    setSplitterList([{ id: uuid, size: 100 }]);
  });

  // If tab list length is 0, then the panel will close automatically
  createEffect(() => {
    const tabList = logViewTabList();
    if (tabList.length === 1) return;

    let parseList = tabList;
    const zeroTabList = tabList.filter((tab) => tab.tabs.length === 0);
    if (zeroTabList.length !== 0) {
      zeroTabList.forEach((deletedTab) => {
        parseList = parseList.filter((tab) => tab.id !== deletedTab.id);
      });
      setLogViewTabList(parseList);
    }

    setSplitterList(() => {
      const panelSize = 100 / parseList.length;
      const updateList = parseList.map((panel) => {
        return { id: panel.id, size: panelSize };
      });
      return updateList;
    });

  });

  const [dragOutTabInfo, setDragOutTabInfo] = createSignal<
    [string, string, number[][], string[], string, [number, number]] | undefined // tab id, file path, split indexarray, tab name,
  >();
  const [dragOutTabSplitterId, setDragOutTabSplitterId] = createSignal<string>(
    "",
  ); // tab splitter id

  const dropTabOnSplitter = (index: number) => {
    const indexOnDirection = index + 1;
    const uuid = getCryptoUUID();
    const parseObject = dragOutTabInfo()![3].map((string) => {
      return JSON.parse(string) as PlotContext;
    });
    const parseDraggedTabInfo: [
      string,
      string,
      number[][],
      PlotContext[],
      string,
      [number, number],
    ] = [
      dragOutTabInfo()![0],
      dragOutTabInfo()![1],
      dragOutTabInfo()![2],
      parseObject,
      dragOutTabInfo()![4],
      dragOutTabInfo()![5],
    ];

    setLogViewTabList((prev) => {
      const updateList = [...prev].map((item, i) => {
        if (i === index) {
          return {
            id: item.id,
            tabs: [...item.tabs].filter((item) =>
              item[0] !== dragOutTabInfo()![0]
            ),
          };
        } else return item;
      });
      const newTab = { id: uuid, tabs: [parseDraggedTabInfo] };
      const addNewTabList: {
        id: string;
        tabs: [
          string,
          string,
          number[][],
          PlotContext[],
          string,
          [number, number],
        ][];
      }[] = [
        ...updateList.slice(0, indexOnDirection),
        newTab,
        ...updateList.slice(indexOnDirection),
      ];
      return addNewTabList;
    });
  };

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  async function openFileDialog(): Promise<[string, string] | undefined> {
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
    return [tabId, path.replaceAll("\\", "/")];
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
          gap={"0.5"}
        >
          <For each={splitterList() && logViewTabList()}>
            {(item, index) => (
              <>
                <Show when={index() !== 0}>
                  <Splitter.ResizeTrigger
                    id={`${splitterList()[index() - 1].id}:${item.id}`}
                    width={"4px"}
                    padding={"0"}
                    opacity={"0%"}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "100%";
                      e.currentTarget.style.transition = "opacity 0.3s ease";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "0%";
                      e.currentTarget.style.transition = "opacity 0.3s ease";
                    }}
                  />
                </Show>
                <Splitter.Panel
                  id={item.id}
                  width={"100%"}
                  height={"100%"}
                  gap="0"
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
                        position: "absolute",
                      }}
                      tabList={item.tabs}
                      onCreateTab={async () => {
                        const tabInfo = await openFileDialog();
                        if (!tabInfo) {
                          toaster.create({
                            title: "Ivalid File",
                            description: "The file is invalid.",
                            type: "error",
                          });
                          return;
                        }
                        setLogViewTabList((prev) => {
                          const updateList: {
                            id: string;
                            tabs: [
                              string,
                              string,
                              number[][],
                              PlotContext[],
                              string,
                              [number, number],
                            ][];
                          }[] = [...prev].map((item, i) => {
                            if (i === index()) {
                              const updateTabs = [...item.tabs];
                              return {
                                id: item.id,
                                tabs: [...updateTabs, [...tabInfo, [], [], "", [
                                  0,
                                  0,
                                ]]],
                              };
                            } else return item;
                          });
                          return updateList;
                        });
                      }}
                      onDeleteTab={(deleteTabId) => {
                        setLogViewTabList((prev) => {
                          const updateList = [...prev].map((item, i) => {
                            if (i === index()) {
                              return {
                                id: item.id,
                                tabs: [
                                  ...item.tabs.filter((tab) =>
                                    tab[0] !== deleteTabId
                                  ),
                                ],
                              };
                            } else return item;
                          });
                          return updateList;
                        });
                      }}
                      onDraggedTabInfo={(
                        draggedId,
                        filepath,
                        indexArray,
                        plotContext,
                        tabName,
                        xRange,
                        tabListId,
                      ) => {
                        setDragOutTabInfo([
                          draggedId,
                          filepath,
                          indexArray,
                          plotContext,
                          tabName,
                          xRange,
                        ]);
                        setDragOutTabSplitterId(tabListId);
                      }}
                      onTabDrop={() => {
                        if (dragOutTabSplitterId() === item.id) return;
                        setLogViewTabList((prev) => {
                          const updateList: {
                            id: string;
                            tabs: [
                              string,
                              string,
                              number[][],
                              PlotContext[],
                              string,
                              [number, number],
                            ][];
                          }[] = [...prev].map((item, i) => {
                            if (index() === i) {
                              const parseObject = dragOutTabInfo()![3].map(
                                (string) => {
                                  return JSON.parse(string) as PlotContext;
                                },
                              );
                              const parseDraggedTabInfo: [
                                string,
                                string,
                                number[][],
                                PlotContext[],
                                string,
                                [number, number],
                              ] = [
                                dragOutTabInfo()![0],
                                dragOutTabInfo()![1],
                                dragOutTabInfo()![2],
                                parseObject,
                                dragOutTabInfo()![4],
                                dragOutTabInfo()![5],
                              ];
                              return {
                                id: item.id,
                                tabs: [...item.tabs, [...parseDraggedTabInfo]],
                              };
                            } else if (item.id === dragOutTabSplitterId()) {
                              return {
                                id: item.id,
                                tabs: [...item.tabs.filter((item) => {
                                  return item[0] !== dragOutTabInfo()![0];
                                })],
                              };
                            } else return item;
                          });
                          return updateList;
                        });
                      }}
                      onContextChange={(id, changedCtx) => {
                        setLogViewTabList((prev) => {
                          const updateList = [...prev];
                          updateList[index()].tabs = updateList[index()].tabs
                            .map(
                              (
                                [
                                  splitTab,
                                  filePath,
                                  indexArray,
                                  ctx,
                                  tabName,
                                  xRange,
                                ],
                              ) => {
                                if (splitTab === id) {
                                  return [
                                    splitTab,
                                    filePath,
                                    indexArray,
                                    changedCtx,
                                    tabName,
                                    xRange,
                                  ];
                                } else {
                                  return [
                                    splitTab,
                                    filePath,
                                    indexArray,
                                    ctx,
                                    tabName,
                                    xRange,
                                  ];
                                }
                              },
                            );
                          return updateList;
                        });
                      }}
                      onSplit={(id, splitArray) => {
                        setLogViewTabList((prev) => {
                          const updateList = [...prev];
                          updateList[index()].tabs = updateList[index()].tabs
                            .map(
                              (
                                [
                                  splitTab,
                                  filePath,
                                  indexArray,
                                  ctx,
                                  tabName,
                                  xRange,
                                ],
                              ) => {
                                if (splitTab === id) {
                                  return [
                                    splitTab,
                                    filePath,
                                    splitArray,
                                    ctx,
                                    tabName,
                                    xRange,
                                  ];
                                } else {
                                  return [
                                    splitTab,
                                    filePath,
                                    indexArray,
                                    ctx,
                                    tabName,
                                    xRange,
                                  ];
                                }
                              },
                            );
                          return updateList;
                        });
                      }}
                      onTabNameChange={(id, changedName) => {
                        setLogViewTabList((prev) => {
                          const updateList = [...prev];
                          updateList[index()].tabs = updateList[index()].tabs
                            .map(
                              (
                                [
                                  splitTab,
                                  filePath,
                                  indexArray,
                                  ctx,
                                  tabName,
                                  xRange,
                                ],
                              ) => {
                                if (splitTab === id) {
                                  return [
                                    splitTab,
                                    filePath,
                                    indexArray,
                                    ctx,
                                    changedName,
                                    xRange,
                                  ];
                                } else {
                                  return [
                                    splitTab,
                                    filePath,
                                    indexArray,
                                    ctx,
                                    tabName,
                                    xRange,
                                  ];
                                }
                              },
                            );
                          return updateList;
                        });
                      }}
                      onTabContextDragEnter={(isTabContextDragEnter) => {
                        const tabListIndex = isTabContextDragEnter
                          ? index()
                          : null;
                        setIsDragging([isTabContextDragEnter, tabListIndex]);
                      }}
                      onXRangeChange={(id, changedXRange) => {
                        setLogViewTabList((prev) => {
                          const updateList = [...prev];
                          updateList[index()].tabs = updateList[index()].tabs
                            .map(
                              (
                                [
                                  splitTab,
                                  filePath,
                                  indexArray,
                                  ctx,
                                  tabName,
                                  xRange,
                                ],
                              ) => {
                                if (splitTab === id) {
                                  return [
                                    splitTab,
                                    filePath,
                                    indexArray,
                                    ctx,
                                    tabName,
                                    changedXRange,
                                  ];
                                } else {
                                  return [
                                    splitTab,
                                    filePath,
                                    indexArray,
                                    ctx,
                                    tabName,
                                    xRange,
                                  ];
                                }
                              },
                            );
                          return updateList;
                        });
                      }}
                    />
                  </div>
                  <Show
                    when={isDragging()[0] && isDragging()[1] === index() &&
                      item.tabs.length > 1 &&
                      dragOutTabSplitterId() === item.id}
                  >
                    <Stack
                      backgroundColor={"bg.muted"}
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
                        dropTabOnSplitter(index());
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
