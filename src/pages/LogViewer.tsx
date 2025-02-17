import { Stack } from "styled-system/jsx";
import { Splitter } from "~/components/ui/splitter";
import { createEffect, createSignal, Show } from "solid-js";
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

  createEffect(() => {
    const leftTabList = logViewTabListLeft();
    if (leftTabList.length === 0 && logViewTabListRight().length !== 0) {
      setLogViewTabListLeft(logViewTabListRight());
      setLogViewTabListRight([]);
    }
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

    const tabId = crypto.randomUUID();
    return [tabId, path.replaceAll("\\", "/")];
  }

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  const [draggedTabInfo, setDraggedTabInfo] = createSignal<[string, string]>();

  const [orientationMode, setOrientationMode] = createSignal<
    "vertical" | "horizontal" | undefined
  >("horizontal");

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
        orientation={orientationMode()}
        size={[
          { id: "a", size: 50 },
          { id: "b", size: 50 },
        ]}
        width={"calc(100% -3rem)"}
        height={"calc(100% -3rem)"}
        style={{ "overflow-y": "hidden" }}
      >
        <Splitter.Panel id="a">
          <div style={{ "width": "100%", "height": "100%" }}>
            <LogViewerTabList
              style={{ "width": "100%", "height": "100%" }}
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
              onDraggedTabId={(id, path) => {
                setDraggedTabInfo([id, path]);
              }}
              onTabDrop={() => {
                const findDuplicateTab =
                  logViewTabListLeft().filter(([tabId, _]) => {
                    return tabId === draggedTabInfo()![0];
                  }).length;
                if (findDuplicateTab === 1) return;

                setLogViewTabListLeft((prev) => {
                  return [...prev, draggedTabInfo()!];
                });
                setLogViewTabListRight((prev) => {
                  return prev.filter(([tabId, _]) => {
                    return tabId !== draggedTabInfo()![0];
                  });
                });
                setDraggedTabInfo(undefined);
              }}
              onReorderTab={(tabList) => {
                setLogViewTabListLeft(tabList);
                setDraggedTabInfo(undefined);
              }}
            />
          </div>
        </Splitter.Panel>
        <Show when={logViewTabListRight().length !== 0}>
          <Splitter.ResizeTrigger id="a:b" />
        </Show>
        <Show when={logViewTabListRight().length !== 0}>
          <Splitter.Panel
            id="b"
            draggable
            onDragStart={(e) =>
              e.dataTransfer!.setData("text/plain", e.target.id)}
          >
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
                  onDraggedTabId={(id, path) => {
                    setDraggedTabInfo([id, path]);
                  }}
                  onTabDrop={() => {
                    const findDuplicateTab =
                      logViewTabListRight().filter(([tabId, _]) => {
                        return tabId === draggedTabInfo()![0];
                      }).length;
                    if (findDuplicateTab === 1) return;

                    setLogViewTabListRight((prev) => {
                      return [...prev, draggedTabInfo()!];
                    });
                    setLogViewTabListLeft((prev) => {
                      return prev.filter(([tabId, _]) => {
                        return tabId !== draggedTabInfo()![0];
                      });
                    });
                    setDraggedTabInfo(undefined);
                  }}
                  onReorderTab={(tabList) => {
                    setLogViewTabListRight(tabList);
                    setDraggedTabInfo(undefined);
                  }}
                />
              </div>
            </div>
          </Splitter.Panel>
        </Show>
      </Splitter.Root>
      <Show
        when={logViewTabListRight().length === 0 &&
          logViewTabListLeft().length > 1}
      >
        <Stack
          backgroundColor={"bg.disabled"}
          style={{
            width: "50%",
            height: "calc(100% - 3rem) ",
            "border-width": "1",
            position: "absolute",
            bottom: "0",
            "right": "0",
            opacity: "0%",
          }}
          onDragEnter={(e) => {
            e.currentTarget.style.opacity = "30%";
          }}
          onDragLeave={(e) => {
            e.currentTarget.style.opacity = "0%";
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.currentTarget.style.opacity = "0%";
            setLogViewTabListLeft((prev) => {
              return prev.filter((prevTabId) =>
                prevTabId[0] !== draggedTabInfo()![0]
              );
            });
            setLogViewTabListRight([draggedTabInfo()!]);
          }}
        >
        </Stack>
      </Show>
      <Show
        when={logViewTabListRight().length >= 1 &&
          orientationMode() === "horizontal"}
      >
        <Stack
          backgroundColor={"bg.disabled"}
          style={{
            width: "100%",
            height: "calc(50% - 3rem)",
            "border-width": "1",
            position: "absolute",
            bottom: "0",
            opacity: "0%",
          }}
          onDragEnter={(e) => {
            e.currentTarget.style.opacity = "30%";
          }}
          onDragLeave={(e) => {
            e.currentTarget.style.opacity = "0%";
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const id = e.dataTransfer!.getData("text");
            e.currentTarget.style.opacity = "0%";
            if (id.split(":").pop() !== "b") return;
            setOrientationMode("vertical");
          }}
        >
        </Stack>
      </Show>
      <Show
        when={logViewTabListRight().length >= 1 &&
          orientationMode() === "vertical"}
      >
        <Stack
          backgroundColor={"bg.disabled"}
          style={{
            width: "50%",
            height: "calc(100% - 3rem)",
            "border-width": "1",
            position: "absolute",
            right: "0",
            bottom: "0",
            opacity: "0%",
          }}
          onDragEnter={(e) => {
            e.currentTarget.style.opacity = "30%";
          }}
          onDragLeave={(e) => {
            e.currentTarget.style.opacity = "0%";
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const id = e.dataTransfer!.getData("text");
            e.currentTarget.style.opacity = "0%";
            if (id.split(":").pop() !== "b") return;
            setOrientationMode("horizontal");
          }}
        >
        </Stack>
      </Show>
    </>
  );
}

export default LogViewer;
