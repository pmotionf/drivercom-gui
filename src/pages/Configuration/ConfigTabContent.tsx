import { IconX } from "@tabler/icons-solidjs";
import { Command } from "@tauri-apps/plugin-shell";
import { createEffect, createSignal, on, Show, useContext } from "solid-js";
import { Stack } from "styled-system/jsx";
import { ConfigForm } from "~/components/ConfigForm";
import { FileMenu } from "~/components/FileMenu";
import { PortMenu } from "~/components/PortMenu";
import { tabPageContext } from "~/components/TabList";
import { Button } from "~/components/ui/button";
import { Editable } from "~/components/ui/editable";
import { Text } from "~/components/ui/text";
import { Toast } from "~/components/ui/toast";
import { Tooltip } from "~/components/ui/tooltip";
import {
  configFormFileFormat,
  portId,
  recentConfigFilePaths,
  setRecentConfigFilePaths,
  tabContexts,
} from "~/GlobalState";

import {
  AccordionStatuses,
  LinkedStatuses,
  GainLockStatuses,
} from "~/components/ConfigForm";
import { file } from "~/utils/file";

export type ConfigTabPage = {
  filePath?: string;
  configForm?: object;
  configAccordionStatuses?: AccordionStatuses;
  configLinkedStatuses?: LinkedStatuses;
  configGainLockStatuses?: GainLockStatuses;
};

export function ConfigTabContent() {
  const configTabProps = useContext(tabPageContext);
  if (!configTabProps) return;
  if (!tabContexts.get(configTabProps.key)) return;

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  const getTabIndex = () => {
    const index = tabContexts
      .get(configTabProps.key)![0]
      .tabContext.map((ctx) => ctx.tab.id)
      .indexOf(configTabProps.tabId);
    return index;
  };

  const getConfigForm = () => {
    return tabContexts.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.configForm!;
  };

  const setConfigForm = (config: object) => {
    return tabContexts.get(configTabProps.key)![1](
      "tabContext",
      getTabIndex(),
      "tabPage",
      "configTabPage",
      "configForm",
      config,
    );
  };

  const getTabName = () => {
    return tabContexts.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tab!.tabName;
  };

  const setTabName = (tabName: string) => {
    return tabContexts.get(configTabProps.key)![1](
      "tabContext",
      getTabIndex(),
      "tab",
      "tabName",
      tabName,
    );
  };

  const getFilePath = () => {
    return tabContexts.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.filePath;
  };

  const setFilePath = (filePath: string | null) => {
    return tabContexts.get(configTabProps.key)![1](
      "tabContext",
      getTabIndex(),
      "tabPage",
      "configTabPage",
      "filePath",
      filePath ? filePath : undefined,
    );
  };

  const getAccordionStatuses = () => {
    return tabContexts.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.configAccordionStatuses;
  };

  const getLinkedStatuses = () => {
    return tabContexts.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.configLinkedStatuses;
  };

  const getGainLockStatuses = () => {
    return tabContexts.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.configGainLockStatuses;
  };

  const [render, setRender] = createSignal<boolean>(true);

  const refresh = () => {
    setRender(false);
    setRender(true);
  };

  async function getConfigFromPort(): Promise<{
    stdout: string;
    stderr: string;
  }> {
    const configGet = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `config.get`,
    ]);
    const output = await configGet.execute();
    return { stdout: output.stdout, stderr: output.stderr };
  }

  function setFormData(data: object, path: string) {
    setConfigForm(data);
    setFilePath(path);
    setTabName(path.split("/").pop()!);
    addRecentFile(path);
  }

  async function saveConfigToPort(config: object): Promise<string> {
    const json_str = JSON.stringify(config, null, "  ");
    const saveConfig = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `config.set`,
      json_str,
    ]);
    const output = await saveConfig.execute();
    return output.stderr;
  }

  const [formName, setFormName] = createSignal<string>(getTabName());
  createEffect(
    on(
      () => getTabName(),
      () => {
        setFormName(getTabName());
      },
      { defer: true },
    ),
  );

  let scrollContainer: HTMLDivElement | undefined;
  const scrollToWrongField = (scrollContainer: HTMLDivElement) => {
    const top = Array.from(
      document.querySelectorAll(`[data-name*="config_field_error"]`),
    )[0].parentElement?.offsetTop;

    if (top) {
      const one_rem = parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      );
      scrollContainer.scrollTo({
        top: top - scrollContainer.offsetTop - one_rem,
      });
    }
  };

  const addRecentFile = (filePath: string) => {
    return setRecentConfigFilePaths((prev) => [
      filePath,
      ...prev.filter((prevPath) => prevPath !== filePath),
    ]);
  };

  const deleteRecentFile = (filePath: string) => {
    return setRecentConfigFilePaths((prev) =>
      prev.filter((prevPath) => filePath !== prevPath),
    );
  };

  const invalidFileMsg = (desc: string) => {
    return toaster.create({
      title: "Invalid File",
      description: desc.split(":")[1],
      type: "error",
    });
  };

  return (
    <div
      id={configTabProps.key}
      style={{
        "padding-bottom": "0.5rem",
        height: "100%",
        width: `100% `,
        "justify-content": "center",
        display: "flex",
      }}
    >
      <Stack
        style={{
          width: "40%",
          height: `calc(100% - 1rem)`,
          "margin-top": "0.5rem",
          "padding-top": "1rem",
          "padding-bottom": "1rem",
          "padding-left": "1rem",
          "padding-right": "1rem",
          "min-width": "30rem",
          "border-radius": "0.5rem",
          "box-shadow": "0px 0px 15px 1px rgb(0,0,0,0.05)",
          "border-width": "1px",
        }}
        borderColor="bg.muted"
        backgroundColor="bg.default"
      >
        <Stack direction="row" width="100%">
          <Tooltip.Root positioning={{ placement: "bottom-start" }}>
            <Tooltip.Trigger width={`calc(100% - 9rem)`}>
              <Editable.Root
                placeholder="File name"
                value={formName()}
                onValueChange={(e) => {
                  setFormName(e.value);
                }}
                activationMode="dblclick"
                onValueCommit={(e) => {
                  setTabName(e.value);
                }}
                fontWeight="bold"
                fontSize="2xl"
              >
                <Editable.Area>
                  <Editable.Input width="100%" />
                  <Editable.Preview
                    width="100%"
                    style={{
                      "white-space": "nowrap",
                      "text-overflow": "ellipsis",
                      display: "block",
                      overflow: "hidden",
                      "text-align": "left",
                    }}
                  />
                </Editable.Area>
              </Editable.Root>
            </Tooltip.Trigger>
            <Show when={getFilePath()}>
              <Tooltip.Positioner>
                <Tooltip.Content backgroundColor="bg.default">
                  <Text color="fg.default">{getFilePath()!}</Text>
                </Tooltip.Content>
              </Tooltip.Positioner>
            </Show>
          </Tooltip.Root>
          <FileMenu
            filePath={getFilePath() ? getFilePath()! : ""}
            recentFiles={recentConfigFilePaths()}
            onNewFile={() => {
              const newEmptyFile = JSON.parse(
                JSON.stringify(configFormFileFormat()),
              );
              setTabName("New File");
              setConfigForm(newEmptyFile);
              setFilePath(null);
              refresh();
            }}
            onOpenFile={async () => {
              try {
                const path = await file.openDialog("json");
                const newFile = await file.read(path);
                const isFormatMatch = file.isFormatMatch(
                  newFile,
                  configFormFileFormat(),
                );
                if (isFormatMatch) {
                  setFormData(newFile, path);
                }
              } catch (e) {
                if (e) {
                  invalidFileMsg(e.toString());
                }
              }
            }}
            onOpenRecentFile={async (filePath: string) => {
              try {
                const newFile = await file.read(filePath);
                const isFileMatch = file.isFormatMatch(
                  newFile,
                  configFormFileFormat(),
                );
                if (isFileMatch) {
                  setFormData(newFile, filePath);
                }
              } catch (e) {
                if (e) {
                  invalidFileMsg(e.toString());
                }
                deleteRecentFile(filePath);
              }
            }}
            onDeleteRecentPath={(index: number) => {
              setRecentConfigFilePaths((prev) => {
                return prev.filter((_, i) => i !== index);
              });
            }}
            onReloadFile={async () => {
              if (!getFilePath()) return;
              const filePath = getFilePath();
              try {
                const newFile = await file.read(filePath!);
                const isFormatMatch = file.isFormatMatch(
                  newFile,
                  configFormFileFormat(),
                );
                if (isFormatMatch) {
                  setFormData(newFile, filePath!);
                }
              } catch (e) {
                if (e) {
                  invalidFileMsg(e.toString());
                }
                deleteRecentFile(filePath!);
              }
            }}
            onSaveFile={async () => {
              try {
                const isFileMatch = file.isFormatMatch(
                  getConfigForm(),
                  configFormFileFormat(),
                );
                if (isFileMatch) {
                  const path = await file.saveDialog(
                    "json",
                    getFilePath() ? getFilePath()! : "",
                    getTabName(),
                  );
                  await file.write(path, getConfigForm());
                  addRecentFile(path.replaceAll("\\", "/"));
                }
              } catch (e) {
                if (scrollContainer) {
                  scrollToWrongField(scrollContainer);
                }
                if (e) {
                  invalidFileMsg(e.toString());
                }
              }
            }}
          />
          <PortMenu
            disabled={portId().length === 0}
            onGetFromPort={async () => {
              if (portId().length === 0) return;
              setFilePath(null);
              const output = await getConfigFromPort();
              if (output.stderr.length !== 0) {
                toaster.create({
                  title: "Communication Error",
                  description: output.stderr,
                  type: "error",
                });
              } else {
                const parseConfigToObject = JSON.parse(output.stdout);
                setTabName(portId());
                setConfigForm(parseConfigToObject);
                refresh();
              }
            }}
            onSaveToPort={async () => {
              if (portId().length === 0) return;
              if (
                !file.isFormatMatch(getConfigForm(), configFormFileFormat())
              ) {
                if (scrollContainer) {
                  scrollToWrongField(scrollContainer);
                }
                toaster.create({
                  title: "Invalid File",
                  description: "The file is invalid.",
                  type: "error",
                });
                return;
              }
              const outputError = await saveConfigToPort(getConfigForm());
              if (outputError.length !== 0) {
                toaster.create({
                  title: "Communication Error",
                  description: outputError,
                  type: "error",
                });
                return;
              }
              toaster.create({
                title: "Communication Success",
                description: "Configuration saved to port successfully.",
                type: "error",
              });
            }}
          >
            <Button
              disabled={portId().length === 0}
              variant="outline"
              borderColor="bg.disabled"
              borderRadius="0.4rem"
            >
              Port
            </Button>
          </PortMenu>
        </Stack>
        <Show when={render()}>
          <div
            ref={scrollContainer}
            style={{
              "overflow-y": "auto",
              width: "100%",
              height: "100%",
              "border-top-width": "1px",
              "border-bottom-width": "1px",
              "padding-bottom": "0.5rem",
            }}
          >
            <ConfigForm
              config={getConfigForm()!}
              label={getTabName()}
              linkedStatuses={getLinkedStatuses()!}
              accordionStatuses={getAccordionStatuses()!}
              gainLockStatuses={getGainLockStatuses()!}
            />
          </div>
        </Show>
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
      </Stack>
    </div>
  );
}
