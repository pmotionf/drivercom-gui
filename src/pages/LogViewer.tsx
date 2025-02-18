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
      tabs: [string, string, number[][], PlotContext[], string][];
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

  const [draggedTabInfo, setDraggedTabInfo] = createSignal<
    [string, string, number[][], PlotContext[], string] | undefined // tab id, file path, split indexarray, tab name,
  >();
  const [draggedTabIsFrom, setDraggedTabIsFrom] = createSignal<string>(""); // tab list id

  const dropTabOnSplitter = (index: number) => {
    const indexOnDirection = index + 1;
    const uuid = getCryptoUUID();
    setLogViewTabList((prev) => {
      const updateList = [...prev].map((item, i) => {
        if (i === index) {
          return {
            id: item.id,
            tabs: [...item.tabs].filter((item) =>
              item[0] !== draggedTabInfo()![0]
            ),
          };
        } else return item;
      });
      const newTab = { id: uuid, tabs: [draggedTabInfo()!] };
      const addNewTabList: {
        id: string;
        tabs: [string, string, number[][], PlotContext[], string][];
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
        >
          <For each={splitterList() && logViewTabList()}>
            {(item, index) => (
              <>
                <Show when={index() !== 0}>
                  <Splitter.ResizeTrigger
                    id={`${logViewTabList()[index() - 1].id}:${item.id}`}
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
                            ][];
                          }[] = [...prev].map((item, i) => {
                            if (i === index()) {
                              const updateTabs = [...item.tabs];
                              return {
                                id: item.id,
                                tabs: [...updateTabs, [...tabInfo, [], [], ""]],
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
                        tabListId,
                      ) => {
                        setDraggedTabInfo([
                          draggedId,
                          filepath,
                          indexArray,
                          plotContext,
                          tabName,
                        ]);
                        setDraggedTabIsFrom(tabListId);
                      }}
                      onTabDrop={() => {
                        if (draggedTabIsFrom() === item.id) return;
                        setLogViewTabList((prev) => {
                          const updateList: {
                            id: string;
                            tabs: [
                              string,
                              string,
                              number[][],
                              PlotContext[],
                              string,
                            ][];
                          }[] = [...prev].map((item, i) => {
                            if (index() === i) {
                              return {
                                id: item.id,
                                tabs: [...item.tabs, [...draggedTabInfo()!]],
                              };
                            } else if (item.id === draggedTabIsFrom()) {
                              return {
                                id: item.id,
                                tabs: [...item.tabs.filter((item) => {
                                  return item[0] !== draggedTabInfo()![0];
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
                                [splitTab, filePath, indexArray, ctx, tabName],
                              ) => {
                                if (splitTab === id) {
                                  return [
                                    splitTab,
                                    filePath,
                                    indexArray,
                                    changedCtx,
                                    tabName,
                                  ];
                                } else {
                                  return [
                                    splitTab,
                                    filePath,
                                    indexArray,
                                    ctx,
                                    tabName,
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
                                [splitTab, filePath, indexArray, ctx, tabName],
                              ) => {
                                if (splitTab === id) {
                                  return [
                                    splitTab,
                                    filePath,
                                    splitArray,
                                    ctx,
                                    tabName,
                                  ];
                                } else {
                                  return [
                                    splitTab,
                                    filePath,
                                    indexArray,
                                    ctx,
                                    tabName,
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
                                [splitTab, filePath, indexArray, ctx, tabName],
                              ) => {
                                if (splitTab === id) {
                                  return [
                                    splitTab,
                                    filePath,
                                    indexArray,
                                    ctx,
                                    changedName,
                                  ];
                                } else {
                                  return [
                                    splitTab,
                                    filePath,
                                    indexArray,
                                    ctx,
                                    tabName,
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
                    />
                  </div>
                  <Show
                    when={isDragging()[0] && isDragging()[1] === index() &&
                      item.tabs.length > 1}
                  >
                    <Stack
                      backgroundColor={"bg.muted"}
                      style={{
                        width: "50%",
                        height: "100%",
                        "margin-top": "6rem",
                        opacity: "0%",
                      }}
                      onDragEnter={(e) =>
                        e.currentTarget.style.opacity = "100%"}
                      onDragLeave={(e) => e.currentTarget.style.opacity = "0%"}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        dropTabOnSplitter(index());
                        setIsDragging([false, null]);
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
