import { createSignal, Show, useContext } from "solid-js";
import { Stack } from "styled-system/jsx";
import { ConfigForm } from "~/components/ConfigForm";
import { FileMenu } from "~/components/FileMenu";
import { PortMenu } from "~/components/PortMenu";
import { tabPageContext } from "~/components/TabList";
import { Button } from "~/components/ui/button";
import { Editable } from "~/components/ui/editable";
import { Text } from "~/components/ui/text";
import { Tooltip } from "~/components/ui/tooltip";
import { recentConfigFilePaths, tabContexts } from "~/GlobalState";

export type ConfigTabContentProps = {
  onNewFile?: (key: string, tabIndex: number) => void
};

export function ConfigTabContent(props: ConfigTabContentProps) {
const configTabProps = useContext(tabPageContext)
if(!configTabProps) return
if (!tabContexts.get(configTabProps.key)) return;

const getTabIndex = () => {
    const index = tabContexts.get(configTabProps.key)![0].tabContext.map((ctx) => ctx.id).indexOf(configTabProps.tabId)
    return index
}

const getConfigForm = () => {
    return tabContexts.get(configTabProps.key)![0].tabContext[getTabIndex()].configFile
}

const getTabName = () => {
    return tabContexts.get(configTabProps.key)![0].tabContext[getTabIndex()].tabName
}

const setTabName = (tabName: string) => {
    return tabContexts.get(configTabProps.key)![1]("tabContext", getTabIndex(), "tabName", tabName)
}

const getFilePath = () => {
    return tabContexts.get(configTabProps.key)![0].tabContext[getTabIndex()].filePath
}

const [render, setRender] = createSignal<boolean>(true)

const refresh = () => {
    setRender(false)
    setRender(true)
}

  return (
    <Show when = {render()}>
    <div
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
                  defaultValue={getTabName() ? getTabName() : "New File"}
                  activationMode="dblclick"
                  onValueCommit={(e) => {
                    setTabName(e.value)
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
                setFormName("New File");
                setConfig(newEmptyFile);
                setFilePath(null);
                refresh();
              }}
              onOpenFile={async () => {
                const path = await openFileDialog();
                if (!path) return;
                const object = await readJsonFile(path);
                const checkObject = compareFileFormat(
                  object!,
                  configFormFileFormat(),
                );
                if (!checkObject) {
                  toaster.create({
                    title: "Invalid File",
                    description: "The file is invalid.",
                    type: "error",
                  });
                  return;
                }
                setFormData(object!, path);
                refresh();
              }}
              onOpenRecentFile={async (filePath: string) => {
                const object = await readJsonFile(filePath);
                const checkObject = compareFileFormat(
                  object!,
                  configFormFileFormat(),
                );
                if (!checkObject) {
                  toaster.create({
                    title: "Invalid File",
                    description: "The file is invalid.",
                    type: "error",
                  });
                  return;
                }
                setFormData(object!, filePath);
                refresh();
              }}
              onDeleteRecentPath={(index: number) => {
                setRecentConfigFilePaths((prev) => {
                  return prev.filter((_, i) => i !== index);
                });
              }}
              onReloadFile={async () => {
                const object = await readJsonFile(filePath()!);
                const checkObject = compareFileFormat(
                  object!,
                  configFormFileFormat(),
                );
                if (!checkObject) {
                  toaster.create({
                    title: "Invalid File",
                    description: "The file is invalid.",
                    type: "error",
                  });
                  return;
                }
                setFormData(object!, filePath()!);
                refresh();
              }}
              onSaveFile={() => saveConfigAsFile()}
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
                  setFormName(portId());
                  setConfig(parseConfigToObject);
                  refresh();
                }
              }}
              onSaveToPort={async () => {
                if (portId().length === 0) return;
                const outputError = await saveConfigToPort();
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
          
          <ConfigForm config={getConfigForm()!} label={getTabName() ? getTabName()! : "New File"} />
      </Stack>
    </div>
    </Show>
  );
}
