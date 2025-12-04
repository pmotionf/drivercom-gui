import {
  IconX,
  IconFileCheck,
  IconExclamationCircle,
  IconPlayerStop,
  IconProgressDown,
  IconRefreshAlert,
  IconPlayerPlay,
  IconFolderPause,
} from "@tabler/icons-solidjs";
import { IconButton } from "./ui/icon-button";
import { createEffect, createSignal, For, JSX, on, Show } from "solid-js";
import { Button } from "./ui/button";
import { Stack } from "styled-system/jsx";
import { Text } from "./ui/text";
import {
  csvFileDownloads,
  pageKeys,
  Pages,
  panelContexts,
  portCommands,
  setCsvFileDownloads,
  setPage,
  tabContexts,
} from "~/GlobalState.ts";
import { trackStore } from "@solid-primitives/deep";
import { createStore } from "solid-js/store";
import { PanelSizeContext } from "./PanelLayout";
import { TabContext } from "./TabList";
import { TabListContext } from "./TabList";
import { css } from "styled-system/css";
import { Progress } from "@ark-ui/solid/progress";

export enum DownloadStatus {
  Progressing,
  Stopped,
  Success,
  Error,
}

export type DownloadStates = {
  filePath: string;
  status: DownloadStatus;
  port: string;
  pid: number;
  downloadProgress: number;
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
    <Show when={openPopover()}>
      <div {...props}>
        <div
          class={css({ background: "bg.default", boxShadow: "md" })}
          style={{
            width: "16em",
            "max-height": "15em",
            height: "100%",
            "border-width": "1px",
            "border-radius": "0.5em",
          }}
        >
          <Stack
            width="100%"
            direction={"row-reverse"}
            background={"bg.subtle"}
            borderBottomWidth={"1px"}
            alignItems={"center"}
            borderRadius={"0.5em 0.5em 0 0"}
          >
            <IconButton
              size="xs"
              variant="ghost"
              onClick={() => setCsvFileDownloads([])}
            >
              <IconX />
            </IconButton>
            <Text size="xs" width="100%" paddingLeft="1em" fontWeight="bold">
              {"Downloads"}
            </Text>
          </Stack>
          <div
            style={{
              width: "16em",
              "overflow-y": "auto",
              "max-height": "12em",
              height: "100%",
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
                    onClick={() => {
                      if (download.status === DownloadStatus.Success) {
                        openNewTab(download.filePath);
                        setCsvFileDownloads(
                          csvFileDownloads.filter((_, i) => i !== index()),
                        );
                      }
                    }}
                  >
                    <Stack width="2em" marginRight={"0.5em"}>
                      <Show when={download.status === DownloadStatus.Success}>
                        <IconFileCheck />
                      </Show>
                      <Show when={download.status === DownloadStatus.Error}>
                        <IconExclamationCircle />
                      </Show>
                      <Show
                        when={download.status === DownloadStatus.Progressing}
                      >
                        <IconProgressDown />
                      </Show>
                      <Show when={download.status === DownloadStatus.Stopped}>
                        <IconFolderPause />
                      </Show>
                    </Stack>
                    <Stack
                      gap="0"
                      width={`calc(100% - 7.5em)`}
                      onClick={() => {
                        if (download.status === DownloadStatus.Success) {
                          openNewTab(download.filePath);
                          setCsvFileDownloads(
                            csvFileDownloads.filter((_, i) => i !== index()),
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
                      <Show when={download.status === DownloadStatus.Success}>
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
                              download.filePath.match(/[^?!//]+$/)!.toString(),
                              "",
                            )}
                        </Text>
                      </Show>
                      <Show when={download.status === DownloadStatus.Error}>
                        <Text
                          height="min-content"
                          size="sm"
                          color="fg.muted"
                          fontWeight="medium"
                        >
                          {`Download failed`}
                        </Text>
                      </Show>
                      <Show when={download.status === DownloadStatus.Stopped}>
                        <Text
                          height="min-content"
                          size="sm"
                          color="fg.muted"
                          fontWeight="medium"
                        >
                          {`Downloaded until ${download.downloadProgress}%`}
                        </Text>
                      </Show>
                      <Show
                        when={download.status === DownloadStatus.Progressing}
                      >
                        <div
                          style={{ display: "flex", "align-items": "center" }}
                        >
                          <Text width="2.5em" size="xs">
                            {`${download.downloadProgress}%`}
                          </Text>
                          <div style={{ width: `calc(100% - 3em)` }}>
                            <Progress.Root
                              value={download.downloadProgress}
                              orientation="horizontal"
                              style={{ width: `calc(100% - 2ems)` }}
                            >
                              <Progress.Track
                                class={css({
                                  background: "bg.disabled",
                                  borderRadius: "0.2em",
                                })}
                              >
                                <Progress.Range
                                  style={{ "border-width": "3px" }}
                                  class={css({
                                    borderColor: "fg.default",
                                    transition: "width 0.2s ",
                                    transitionTimingFunction: `cubic-bezier(1.00,0.00,0.00,1.00)`,
                                    borderRadius: "0.2em",
                                  })}
                                />
                              </Progress.Track>
                            </Progress.Root>
                          </div>
                        </div>
                      </Show>
                    </Stack>
                    <Stack width="5em" direction={"row-reverse"} gap="0">
                      <Show
                        when={download.status === DownloadStatus.Progressing}
                        fallback={
                          <IconButton
                            size="xs"
                            variant="ghost"
                            width="2em"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCsvFileDownloads((prev) =>
                                prev.filter((_, i) => i !== index()),
                              );
                            }}
                          >
                            <IconX />
                          </IconButton>
                        }
                      >
                        <IconButton
                          width="2em"
                          size="xs"
                          variant={"ghost"}
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (portCommands.has(download.pid)) {
                              const command = portCommands.get(download.pid);
                              await command!.child.kill();
                              portCommands.delete(download.pid);
                            }
                            setCsvFileDownloads(
                              index(),
                              "status",
                              DownloadStatus.Stopped,
                            );
                          }}
                        >
                          <IconPlayerStop />
                        </IconButton>
                      </Show>

                      <Show
                        when={
                          csvFileDownloads.findIndex(
                            (child) => child.port === download.port,
                          ) === index() &&
                          download.status !== DownloadStatus.Progressing &&
                          download.status !== DownloadStatus.Success
                        }
                      >
                        <IconButton size="sm" variant="ghost" width="2em">
                          <Show
                            when={download.status === DownloadStatus.Stopped}
                            fallback={<IconRefreshAlert />}
                          >
                            <IconPlayerPlay />
                          </Show>
                        </IconButton>
                      </Show>
                    </Stack>
                  </Button>
                );
              }}
            </For>
          </div>
        </div>
      </div>
    </Show>
  );
};
