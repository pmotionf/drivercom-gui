import { IconRuler2, IconRuler2Off } from "@tabler/icons-solidjs";
import { Command } from "@tauri-apps/plugin-shell";
import { createEffect, createSignal, on, Show, useContext } from "solid-js";
import { Stack } from "styled-system/jsx";
import { TabPageContext } from "~/components/Tab/TabList";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { Tooltip } from "~/components/ui/tooltip";
import {
  configDescription,
  configFormFileFormat,
  portCommands,
  setRecentConfigFilePaths,
  tabStore,
} from "~/store/GlobalState";
import {
  ConfigForm,
  LinkStates,
  GainLockStates,
} from "./ConfigForm/ConfigForm";
import { FileHandler } from "../../services/FileHandler";
import { AccordionStates } from "./ConfigForm/ConfigForm";
import JSON5 from "json5";
import { Spinner } from "~/components/ui/spinner";
import { IconButton } from "~/components/ui/icon-button";
import { toaster } from "~/services/Toaster";
import { Menu } from "~/components/ui/menu";
import { ConfigType } from "src-tauri/generated/config/ConfigType";

export type ConfigTabPage = {
  filePath?: string;
  portId?: string;
  configForm?: ConfigType;
  focusedTab?: string;
  configAccordionStatuses?: AccordionStates;
  configLinkedStatuses?: LinkStates;
  configGainLockStatuses?: GainLockStates;
  formName?: string;
  formOverflowY?: Map<string, number>;
  originalFile?: ConfigType;
  changeUnit?: boolean;
};

export function ConfigTabContent() {
  const configTabProps = useContext(TabPageContext);
  if (!configTabProps) return;
  if (!tabStore.get(configTabProps.key)) return;

  const getTabIndex = () => {
    const index = tabStore
      .get(configTabProps.key)![0]
      .tabContext.map((ctx) => ctx.tab.id)
      .indexOf(configTabProps.tabId);
    return index;
  };

  const getConfigForm = () => {
    return tabStore.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.configForm!;
  };

  const setConfigForm = (config: object) => {
    return tabStore.get(configTabProps.key)![1](
      "tabContext",
      getTabIndex(),
      "tabPage",
      "configTabPage",
      "configForm",
      config,
    );
  };

  const getPortId = () => {
    return tabStore.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.portId;
  };

  const setTabName = (newName: string) => {
    return tabStore.get(configTabProps.key)![1](
      "tabContext",
      getTabIndex(),
      "tab",
      "tabName",
      newName,
    );
  };

  const getTabId = () => {
    return tabStore.get(configTabProps.key)![0].tabContext[getTabIndex()].tab
      .id;
  };

  const getFocusedTab = () => {
    return tabStore.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage?.configTabPage?.focusedTab;
  };

  const setFocusedTab = (focusedTab: string) => {
    return tabStore.get(configTabProps.key)![1](
      "tabContext",
      getTabIndex(),
      "tabPage",
      "configTabPage",
      "focusedTab",
      focusedTab,
    );
  };

  const getFilePath = () => {
    return tabStore.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.filePath;
  };

  const setFilePath = (filePath: string | null) => {
    return tabStore.get(configTabProps.key)![1](
      "tabContext",
      getTabIndex(),
      "tabPage",
      "configTabPage",
      "filePath",
      filePath ? filePath : undefined,
    );
  };

  const getOriginalFile = () => {
    return tabStore.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.originalFile;
  };

  const setOriginalFile = (filePath: object) => {
    return tabStore.get(configTabProps.key)![1](
      "tabContext",
      getTabIndex(),
      "tabPage",
      "configTabPage",
      "originalFile",
      filePath,
    );
  };

  const getAccordionStatuses = () => {
    return tabStore.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.configAccordionStatuses;
  };

  const getLinkedStatuses = () => {
    return tabStore.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.configLinkedStatuses;
  };

  const getGainLockStatuses = () => {
    return tabStore.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.configGainLockStatuses;
  };

  const getFormScrollTop = () => {
    return tabStore.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.formOverflowY;
  };

  const getChangeUnit = () => {
    return tabStore.get(configTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.configTabPage!.changeUnit;
  };

  const setChangeUnit = (isChangeUnit: boolean) => {
    return tabStore.get(configTabProps.key)![1](
      "tabContext",
      getTabIndex(),
      "tabPage",
      "configTabPage",
      "changeUnit",
      isChangeUnit,
    );
  };

  const [render, setRender] = createSignal<boolean>(true);

  const fileHandler = new FileHandler();

  function setFormData(data: object, path: string) {
    setConfigForm(data);
    setFilePath(path);
    setTabName(path.split("/").pop()!);
    setRecentConfigFilePaths((prev) => {
      const newRecentFiles = prev.filter(
        (prevFilePath) => prevFilePath !== path,
      );
      return [path, ...newRecentFiles];
    });
    setOriginalFile(JSON5.parse(JSON5.stringify(data)));
  }

  async function saveConfigToPort(config: object): Promise<string> {
    const json_str = JSON.stringify(config, null, "  ");
    const saveConfig = Command.sidecar("binaries/drivercom", [
      `--port`,
      getPortId()!,
      `config.set`,
      json_str,
    ]);
    const output = await saveConfig.execute();
    return output.stderr;
  }

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

  createEffect(
    on(
      () => getPortId(),
      () => {
        if (Array.from(portCommands.values()).length > 0) {
          Array.from(portCommands.values()).forEach((command) => {
            if (command.port !== getPortId()) {
              command.child.kill();
              portCommands.delete(command.child.pid);
            }
          });
        }
      },
      { defer: true },
    ),
  );

  const topBarHeight = "3rem";

  const saveAsFile = async () => {
    try {
      const path = await fileHandler.saveFileDialog("json5", getFilePath()!);
      await fileHandler.writeFile(
        path,
        getConfigForm()!,
        configFormFileFormat(),
      );
      if (getFilePath() && getFilePath() === path) {
        setOriginalFile(JSON5.parse(JSON5.stringify(getConfigForm())));
      }
    } catch {
      toaster.create({
        title: "Invalid File",
        description: "The file is invalid.",
        type: "error",
      });
      return;
    }
  };

  const saveToPort = async () => {
    if (!getPortId() || getPortId()!.length === 0) return;
    if (
      scrollContainer &&
      document.querySelectorAll(`[data-name*="config_field_error"]`).length > 0
    ) {
      scrollToWrongField(scrollContainer);
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
    if (!getFilePath()) {
      setOriginalFile(JSON5.parse(JSON5.stringify(getConfigForm())));
    }
    toaster.create({
      title: "Communication Success",
      description: "Configuration saved to port successfully.",
      type: "error",
    });
  };

  return (
    <div
      id={configTabProps.key}
      style={{
        height: "100%",
        width: `100% `,
        "min-width": "35rem",
      }}
    >
      <Stack
        direction="row"
        width="100%"
        height={topBarHeight}
        padding="0.2rem "
      >
        <Button
          variant={"outline"}
          disabled={!getFilePath() || getFilePath()!.length < 1}
          onClick={async () => {
            if (!getFilePath()) return;
            try {
              setRender(false);
              const file = await fileHandler.readFile(
                getFilePath()!,
                configFormFileFormat(),
              );
              setFormData(file!, getFilePath()!);
              setRender(true);
            } catch {
              toaster.create({
                title: "Invalid File Path",
                description: "The file path is invalid.",
                type: "error",
              });
              setRecentConfigFilePaths((prev) => {
                const newRecentFiles = prev.filter(
                  (prevFilePath) => prevFilePath !== getFilePath()!,
                );
                return newRecentFiles;
              });
              setRender(true);
              return;
            }
          }}
        >
          {"Reload"}
        </Button>
        <Menu.Root>
          <Menu.Trigger>
            <Button variant={"outline"}>{"Save"}</Button>
          </Menu.Trigger>
          <Menu.Positioner>
            <Menu.Content>
              <Menu.Item
                onClick={async () => await saveAsFile()}
                value={"Save as file"}
              >
                {"Save as file"}
              </Menu.Item>
              <Menu.Separator />
              <Menu.Item
                disabled={!getPortId() || getPortId()!.length < 1}
                onClick={async () => await saveToPort()}
                value={"Save to port"}
              >
                {"Save to Port"}
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Menu.Root>
        <Tooltip.Root>
          <Tooltip.Trigger width="min-content">
            <IconButton
              variant={"ghost"}
              onClick={() => setChangeUnit(!getChangeUnit())}
            >
              <Show when={getChangeUnit()} fallback={<IconRuler2Off />}>
                <IconRuler2 />
              </Show>
            </IconButton>
          </Tooltip.Trigger>
          <Tooltip.Positioner>
            <Tooltip.Content>
              {"Change length and weight units"}
            </Tooltip.Content>
          </Tooltip.Positioner>
        </Tooltip.Root>
      </Stack>
      <Show
        when={render()}
        fallback={
          <div
            style={{
              display: "flex",
              "flex-direction": "column",
              "align-items": "center",
              "justify-content": "center",
              width: "100%",
              height: "100%",
              "border-top-width": render() ? "0px" : "1px",
            }}
          >
            <Spinner
              display="flex"
              justifySelf={"center"}
              justifyItems={"center"}
              size="xl"
              borderLeftColor={"bg.muted"}
              borderBottomColor={"bg.muted"}
              borderRightColor={"fg.muted"}
              borderTopColor={"fg.muted"}
              borderWidth={"5px"}
            />
            <Text
              marginTop="1em"
              size="lg"
              fontWeight={"bold"}
              maxWidth="50%"
              textAlign="center"
            >
              {getFilePath()
                ? `Get config from "${getFilePath()}".`
                : getPortId() && getPortId()!.length > 0
                  ? `Get config from "${getPortId()}".`
                  : `Get new config.`}
            </Text>
            <Text
              display="flex"
              justifySelf={"center"}
              marginTop="0.5em"
              size="md"
            >
              {getFilePath()
                ? `Opening...`
                : getPortId() && getPortId()!.length > 0
                  ? `Downloading...`
                  : `Opening...`}
            </Text>
          </div>
        }
      >
        <div
          ref={scrollContainer}
          style={{
            width: "100%",
            height: `100%`,
          }}
        >
          <ConfigForm
            id={getTabId()}
            description={configDescription()}
            originalFile={getOriginalFile()}
            changeUnits={getChangeUnit() ? getChangeUnit() : undefined}
            focusedTab={getFocusedTab()}
            onFocustTabChange={(tabId) => setFocusedTab(tabId)}
            config={getConfigForm()!}
            linkedStatuses={getLinkedStatuses()!}
            accordionStatuses={getAccordionStatuses()!}
            gainLockStatuses={getGainLockStatuses()!}
            formOverflowY={getFormScrollTop()!}
          />
        </div>
      </Show>
    </div>
  );
}
