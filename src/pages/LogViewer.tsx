import { Stack } from "styled-system/jsx";
import { Splitter } from "~/components/ui/splitter";
import { createSignal, Show } from "solid-js";
import { LogViewerTabList } from "./LogViewer/LogViewerTabList";
import { open } from "@tauri-apps/plugin-dialog";
import { Toast } from "~/components/ui/toast";
import { IconX } from "@tabler/icons-solidjs";

function LogViewer() {
  const [logViewTabListLeft, setLogViewTabListLeft] = createSignal<
    [string, string][]
  >([]);
  const [logViewTabListRight, setLogViewTabListRight] = createSignal<
    [string, string][]
  >(
    [],
  );

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

  const [draggedTabIndex, setDraggedTabIndex] = createSignal<number | null>(
    null,
  );

  const reorderTabsOnDragOverLeft = (e: DragEvent, index: number) => {
    e.preventDefault();
    if (draggedTabIndex() !== null && draggedTabIndex() !== index) {
      const updateTab = [...logViewTabListLeft()];
      const [draggedTab] = updateTab.splice(draggedTabIndex()!, 1);
      updateTab.splice(index, 0, draggedTab);
      setLogViewTabListLeft(updateTab);
      setDraggedTabIndex(index);
    }
  };

  const reorderTabsOnDragOverRight = (e: DragEvent, index: number) => {
    e.preventDefault();
    if (draggedTabIndex() !== null && draggedTabIndex() !== index) {
      const updateTab = [...logViewTabListRight()];
      const [draggedTab] = updateTab.splice(draggedTabIndex()!, 1);
      updateTab.splice(index, 0, draggedTab);
      setLogViewTabListRight(updateTab);
      setDraggedTabIndex(index);
    }
  };

  //check drop to other tab
  const [isDropLeft, setIsDropLeft] = createSignal<boolean>(false);
  const [isDropRight, setIsDropRight] = createSignal<boolean>(false);
  const [draggedTabId, setDraggedTabId] = createSignal<[string, string]>();

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  const [draggedTabInfo, setDraggedTabInfo] = createSignal<[string, string]>();

  return (
    <>
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
        size={[
          { id: "a", size: 50 },
          { id: "b", size: 50 },
        ]}
        width={"100%"}
        height={"100%"}
      >
        <Splitter.Panel id="a">
          <div style={{ "width": "100%", "height": "100%" }}>
            <LogViewerTabList
              tabList={logViewTabListLeft()}
              tabListPosition="left"
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
                setLogViewTabListLeft((prev) => [...prev, tabInfo]);
              }}
              onDeleteTab={(deleteTabId) =>
                setLogViewTabListLeft((prev) =>
                  prev.filter((id) => id[0] !== deleteTabId)
                )}
              onReorderTabs={(reorderTabs, index, draggedTabIndex) => {
                reorderTabsOnDragOverLeft(reorderTabs, index);
                setDraggedTabIndex(draggedTabIndex);
              }}
              onDraggedTabIndex={(index) => {
                if (!index) setDraggedTabIndex(index);
              }}
              onDraggedTabId={(id, path) => {
                setDraggedTabInfo([id, path]);
              }}
              onTabDrop={() => {
                const checkIsDrop = logViewTabListLeft().filter((prevTabId) =>
                  prevTabId[0] !== draggedTabInfo()![0]
                );
                if (checkIsDrop.length === 0) return;
                setLogViewTabListRight((prev) => {
                  return prev.filter((prevTabId) =>
                    prevTabId[0] !== draggedTabInfo()![0]
                  );
                });
                setLogViewTabListLeft((prev) => {
                  return [draggedTabInfo()!, ...prev];
                });
                setDraggedTabInfo(undefined);
              }}
            />
          </div>
        </Splitter.Panel>
        <Show when={logViewTabListLeft().length !== 0}>
          <Splitter.ResizeTrigger id="a:b" />
          <Splitter.Panel id="b">
            <div style={{ "width": "100%", "height": "100%" }}>
              <div style={{ "width": "100%", "height": "100%" }}>
                <LogViewerTabList
                  tabList={logViewTabListRight()}
                  tabListPosition="right"
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
                    setLogViewTabListRight((prev) => [...prev, tabInfo]);
                  }}
                  onDeleteTab={(deletTabid) =>
                    setLogViewTabListRight((prev) =>
                      prev.filter((id) => id[0] !== deletTabid)
                    )}
                  onReorderTabs={(reorderTabs, index, draggedTabIndex) => {
                    reorderTabsOnDragOverRight(reorderTabs, index);
                    setDraggedTabIndex(draggedTabIndex);
                  }}
                  onDraggedTabId={(id, path) => {
                    setDraggedTabInfo([id, path]);
                  }}
                  onTabDrop={() => {
                    const checkIsDrop = logViewTabListRight().filter((
                      prevTabId,
                    ) => prevTabId[0] !== draggedTabInfo()![0]);
                    if (checkIsDrop.length === 0) return;
                    setLogViewTabListLeft((prev) => {
                      return prev.filter((prevTabId) =>
                        prevTabId[0] !== draggedTabInfo()![0]
                      );
                    });
                    setLogViewTabListRight((prev) => {
                      return [draggedTabInfo()!, ...prev];
                    });
                    setDraggedTabInfo(undefined);
                  }}
                />
              </div>
            </div>
          </Splitter.Panel>
        </Show>
      </Splitter.Root>
    </>
  );
}

export default LogViewer;
