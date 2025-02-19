import { Stack } from "styled-system/jsx";
import { Splitter } from "~/components/ui/splitter";
import { createEffect, createSignal, For, onMount, Show } from "solid-js";
import { LogViewerTabList } from "./LogViewer/LogViewerTabList";
import { open } from "@tauri-apps/plugin-dialog";
import { Toast } from "~/components/ui/toast";
import { IconX } from "@tabler/icons-solidjs";

function LogViewer() {
  const [logViewTabList, setLogViewTabList] = createSignal<
    { id: string; tabs: [string, string, number[][], string][] }[]
  >([]);
  const [splitterList, setSplitterList] = createSignal<
    { id: string; size: number }[]
  >([]);

  onMount(() => {
    const uuid = crypto.randomUUID();
    setLogViewTabList([{ id: uuid, tabs: [] }]);
    setSplitterList([{ id: uuid, size: 100 }]);
  });

  // If tab list length is 0, then the panel will close automatically
  createEffect(() => {
    const tabList = logViewTabList();
    if (tabList.length === 1) return;
    const zeroTabList = tabList.filter((tab) => tab.tabs.length === 0);
    zeroTabList.forEach((deleteTab) => {
      setSplitterList((prev) => {
        const parsePrevList = prev.filter((tab) => tab.id !== deleteTab.id);
        const panelSize = 100 / parsePrevList.length;
        const updateList = [...parsePrevList].map((panel) => {
          return { id: panel.id, size: panelSize };
        });
        return updateList;
      });
      setLogViewTabList((prev) => {
        return prev.filter((tab) => tab.id !== deleteTab.id);
      });
    });
  });

  const dropTabOnSplitter = (direction: string, index: number) => {
    const indexOnDirection = direction === "right" ? index + 1 : index - 1;
    const uuid = crypto.randomUUID();
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
        tabs: [string, string, number[][], string][];
      }[] = [
        ...updateList.slice(0, indexOnDirection),
        newTab,
        ...updateList.slice(indexOnDirection),
      ];
      return addNewTabList;
    });
    const logViewTabListLength = logViewTabList().length;
    setTimeout(() => {
      setSplitterList((prev) => {
        const panelSize = 100 / (logViewTabListLength + 1);
        const updateList: { id: string; size: number }[] = [...prev].map(
          (line) => {
            return { id: line.id, size: panelSize };
          },
        );
        return [...updateList.slice(0, indexOnDirection), {
          id: uuid,
          size: panelSize,
        }, ...updateList.slice(indexOnDirection)];
      });
    }, 10);
    setIsDragging([false, null]);
  };

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

    const tabId = crypto.randomUUID();
    return [tabId, path.replaceAll("\\", "/")];
  }

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  const [draggedTabInfo, setDraggedTabInfo] = createSignal<
    [string, string, number[][], string] | undefined // tab id, file path, split indexarray, tab name,
  >();
  const [draggedTabIsFrom, setDraggedTabIsFrom] = createSignal<string>(""); // tab list id

  const [isDragging, setIsDragging] = createSignal<[boolean, number | null]>([
    false,
    null,
  ]);

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
                  onDragStart={() => setIsDragging([true, index()])}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnd={() => setIsDragging([false, null])}
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
                            tabs: [string, string, number[][], string][];
                          }[] = [...prev].map((item, i) => {
                            if (i === index()) {
                              return {
                                id: item.id,
                                tabs: [...item.tabs, [...tabInfo, [], ""]],
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
                      onDraggedTabId={(
                        id,
                        path,
                        indexArray,
                        tabName,
                        tabListId,
                      ) => {
                        setDraggedTabInfo([id, path, indexArray, tabName]);
                        setDraggedTabIsFrom(tabListId);
                      }}
                      onTabDrop={() => {
                        if (draggedTabIsFrom() === item.id) return;
                        setLogViewTabList((prev) => {
                          const updateList: {
                            id: string;
                            tabs: [string, string, number[][], string][];
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
                        "margin-left": "0",
                        opacity: "0%",
                        position: "fixed",
                        left: "0",
                      }}
                      onDragEnter={(e) =>
                        e.currentTarget.style.opacity = "100%"}
                      onDragLeave={(e) => e.currentTarget.style.opacity = "0%"}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        dropTabOnSplitter("left", index());
                      }}
                    >
                    </Stack>
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
                        dropTabOnSplitter("right", index());
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
