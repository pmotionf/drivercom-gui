import {
  IconX,
  IconFileCheck,
  IconExclamationCircle,
} from "@tabler/icons-solidjs";
import { IconButton } from "./ui/icon-button";
import { Popover } from "./ui/popover";
import { createEffect, createSignal, For, JSX, on, Show } from "solid-js";
import { Button } from "./ui/button";
import { Stack } from "styled-system/jsx";
import { Text } from "./ui/text";
import {
  csvFileDownloads,
  pageKeys,
  Pages,
  panelContexts,
  setCsvFileDownloads,
  setPage,
  tabContexts,
} from "~/GlobalState.ts";
import { Spinner } from "./ui/spinner";
import { Portal } from "solid-js/web";
import { trackStore } from "@solid-primitives/deep";
import { createStore } from "solid-js/store";
import { PanelSizeContext } from "./PanelLayout";
import { TabContext } from "./TabList";
import { TabListContext } from "./TabList";

export enum DownloadStatus {
  Progressing,
  Success,
  Error,
}

export type DownloadStates = {
  filePath: string;
  status: DownloadStatus;
  port: string;
};

export const DownloadList = (props: JSX.HTMLAttributes<HTMLDivElement>) => {
  const [openPopover, setOpenPopover] = createSignal<boolean>(false);

  createEffect(
    on(
      () => trackStore(csvFileDownloads),
      () => {
        if (csvFileDownloads.length > 0) {
          setOpenPopover(true);
        } else {
          setOpenPopover(false);
        }
      },
      { defer: true },
    ),
  );

  const openNewTab = (newFilePath: string) => {
    if (!pageKeys.has(Pages.LogViewer)) {
      const uuid = crypto.randomUUID();
      pageKeys.set(Pages.LogViewer, uuid);
      panelContexts.set(uuid, createSignal<PanelSizeContext[]>([]));
    }
    const panelKey = pageKeys.get(Pages.LogViewer);
    if (panelKey && panelContexts.get(panelKey)) {
      const panelContext = panelContexts.get(panelKey)!;
      if (panelContext[0]().length === 0) {
        panelContext[1]([{ id: crypto.randomUUID(), size: 100 }]);
      }
      const ctx = panelContext[0]();
      const tabListId = ctx[0].id;
      if (!tabContexts.has(tabListId)) {
        tabContexts.set(
          tabListId,
          createStore<TabListContext>({ tabContext: [], focusedTab: "" }),
        );
      }
      const tabCtx = tabContexts.get(tabListId);
      const newTabID = crypto.randomUUID();
      const newTab: TabContext = {
        tab: {
          id: newTabID,
          tabName: newFilePath
            .replaceAll("\\", "/")
            .match(/[^?!//]+$/!)!
            .toString()
            .slice(0, -4) as string,
        },
        tabPage: {
          logViewerTabPage: {
            filePath: newFilePath,
          },
          configTabPage: null,
        },
      };
      setTimeout(() => {
        tabCtx![1]({
          tabContext: [
            ...(tabCtx![0].tabContext.length !== 0
              ? tabCtx![0].tabContext
              : []),
            newTab,
          ],
          focusedTab: newTabID,
        });
        setPage(Pages.LogViewer);
      }, 200);
    }
  };
  return (
    <div {...props}>
      <Popover.Root positioning={{ placement: "top-end" }} open={openPopover()}>
        <Popover.Trigger width="min-content">{props.children}</Popover.Trigger>
        <Show when={csvFileDownloads.length > 0}>
          <Portal>
            <Popover.Positioner>
              <Popover.Content
                width="16em"
                maxHeight="15em"
                height="100%"
                padding="0"
                borderWidth={"1px"}
              >
                <Stack
                  width="100%"
                  direction={"row-reverse"}
                  background={"bg.subtle"}
                  borderBottomWidth={"1px"}
                  alignItems={"center"}
                >
                  <IconButton
                    size="xs"
                    variant="ghost"
                    onClick={() => setCsvFileDownloads([])}
                  >
                    <IconX />
                  </IconButton>
                  <Text
                    size="xs"
                    width="100%"
                    paddingLeft="1em"
                    fontWeight="bold"
                  >
                    {"Downloads"}
                  </Text>
                </Stack>
                <div
                  style={{
                    width: "16em",
                    "overflow-y": "auto",
                    "max-height": "15em",
                  }}
                >
                  <For each={csvFileDownloads}>
                    {(download, index) => {
                      return (
                        <Button
                          textAlign={"left"}
                          variant="ghost"
                          width="100%"
                          alignItems="center"
                          padding="0.5em 0 0.5em 0.5em"
                          height="4em"
                          gap="0"
                        >
                          <Stack
                            width="2em"
                            height="100%"
                            paddingTop="1em"
                            onClick={() => {
                              if (download.status === DownloadStatus.Success) {
                                openNewTab(download.filePath);
                                setCsvFileDownloads(
                                  csvFileDownloads.filter(
                                    (_, i) => i !== index(),
                                  ),
                                );
                              }
                            }}
                          >
                            <Show
                              when={download.status === DownloadStatus.Success}
                            >
                              <IconFileCheck />
                            </Show>
                            <Show
                              when={download.status === DownloadStatus.Error}
                            >
                              <IconExclamationCircle />
                            </Show>
                            <Show
                              when={
                                download.status === DownloadStatus.Progressing
                              }
                            >
                              <Spinner
                                width="1.1em"
                                height="1.1em"
                                borderWidth="1.5px"
                              />
                            </Show>
                          </Stack>
                          <Stack
                            gap="0"
                            width={`calc(100% - 5em)`}
                            onClick={() => {
                              if (download.status === DownloadStatus.Success) {
                                openNewTab(download.filePath);
                                setCsvFileDownloads(
                                  csvFileDownloads.filter(
                                    (_, i) => i !== index(),
                                  ),
                                );
                              }
                            }}
                          >
                            <Text
                              width="100%"
                              style={{
                                "white-space": "nowrap",
                                "text-overflow": "ellipsis",
                                display: "block",
                                overflow: "hidden",
                              }}
                              height="min-content"
                              size="md"
                              fontWeight="bold"
                            >
                              {download.filePath
                                .replaceAll("\\", "/")
                                .match(/[^//]+$/)!
                                .toString()}
                            </Text>
                            <Show
                              when={download.status === DownloadStatus.Success}
                            >
                              <Text
                                height="min-content"
                                size="sm"
                                color="fg.muted"
                                fontWeight="medium"
                                style={{
                                  "white-space": "nowrap",
                                  "text-overflow": "ellipsis",
                                  display: "block",
                                  overflow: "hidden",
                                }}
                              >
                                {download.filePath
                                  .replaceAll("\\", "/")
                                  .replace(
                                    download.filePath
                                      .match(/[^?!//]+$/)!
                                      .toString(),
                                    "",
                                  )}
                              </Text>
                            </Show>
                            <Show
                              when={download.status === DownloadStatus.Error}
                            >
                              <Text
                                height="min-content"
                                size="sm"
                                color="fg.muted"
                                fontWeight="medium"
                              >
                                {"Download failed."}
                              </Text>
                            </Show>
                            <Show
                              when={
                                download.status === DownloadStatus.Progressing
                              }
                            >
                              <Text
                                height="min-content"
                                size="sm"
                                color="fg.muted"
                                fontWeight="medium"
                              >
                                {"Downloading..."}
                              </Text>
                            </Show>
                          </Stack>
                          <IconButton
                            size="xs"
                            width="1.5em"
                            variant="ghost"
                            borderRadius="3em"
                            onClick={() =>
                              setCsvFileDownloads((prev) =>
                                prev.filter((_, i) => i !== index()),
                              )
                            }
                          >
                            <IconX />
                          </IconButton>
                        </Button>
                      );
                    }}
                  </For>
                </div>
              </Popover.Content>
            </Popover.Positioner>
          </Portal>
        </Show>
      </Popover.Root>
    </div>
  );
};
