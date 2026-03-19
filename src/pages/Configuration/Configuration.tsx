import {
  configFormFileFormat,
  Pages,
  pageKeys,
  tabStore,
  panelStore,
  recentConfigFilePaths,
  setRecentConfigFilePaths,
} from "~/store/GlobalState.ts";
import { Panel } from "~/components/Panel/Panel.tsx";
import {
  PanelLayout,
  PanelSizeContext,
} from "~/components/Panel/PanelLayout.tsx";
import {
  TabContext,
  TabList,
  TabListContext,
} from "~/components/Tab/TabList.tsx";
import { ConfigTabContent } from "./ConfigTabContent.tsx";
import {
  AccordionStates,
  GainLockStates,
  LinkStates,
} from "~/pages/Configuration/ConfigForm/ConfigForm.tsx";
import { createEffect, createSignal, For, on, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { load } from "@tauri-apps/plugin-store";
import { IconButton } from "~/components/ui/icon-button.tsx";
import { IconChevronRight, IconPlus } from "@tabler/icons-solidjs";
import { Dynamic, Portal } from "solid-js/web";
import { Menu } from "~/components/ui/menu.tsx";
import { detectPort, getConfigFromPort, Port } from "~/services/PortService.ts";
import { ConfigType } from "src-tauri/generated/config/ConfigType.tsx";
import { Text } from "~/components/ui/text.tsx";
import { toaster } from "~/services/Toaster.ts";
import { FileHandler } from "~/services/FileHandler.ts";
import JSON5 from "json5";

function Configuration() {
  const [render, setRender] = createSignal<boolean>(false);
  const [tabStoreKey, setTabStoreKey] = createSignal<string>("");
  const [ports, setPorts] = createSignal<Port[]>([]);

  onMount(() => {
    if (!pageKeys.has(Pages.Configuration)) {
      const newPanelKey = crypto.randomUUID();
      pageKeys.set(Pages.Configuration, newPanelKey);

      const panelStoreKey = crypto.randomUUID();
      panelStore.set(
        newPanelKey,
        createSignal<PanelSizeContext[]>([{ id: panelStoreKey, size: 100 }]),
      );
      tabStore.set(
        panelStoreKey,
        createStore<TabListContext>({ tabContext: [], focusedTab: "" }),
      );
      createNewTab(panelStoreKey, configFormFileFormat(), "New File");
    }
    setRender(true);
  });

  const createNewTab = (
    key: string,
    form: ConfigType,
    formName: string,
    portId?: string,
    filePath?: string,
  ) => {
    setRender(false);
    const id = crypto.randomUUID();
    const accordionStatuses: AccordionStates = new Map();
    const linkedStatuses: LinkStates = new Map();
    const gainLockStatuses: GainLockStates = new Map();
    const formOverflowY: Map<string, number> = new Map();
    const newForm = JSON.parse(JSON.stringify(form));
    const newTab = {
      tab: {
        id: id,
        tabName: formName,
      },
      tabPage: {
        configTabPage: {
          filePath: filePath ? filePath : "",
          portId: portId ? portId : "",
          configForm: newForm,
          configAccordionStatuses: accordionStatuses,
          configLinkedStatuses: linkedStatuses,
          configGainLockStatuses: gainLockStatuses,
          originalFile: JSON.parse(JSON.stringify(form)),
          formOverflowY: formOverflowY,
          focusedTab: `${id}.system`,
        },
      },
    } as TabContext;

    if (tabStore.has(key)) {
      const tabCtx = tabStore.get(key)!;
      tabCtx[1]("tabContext", tabCtx[0].tabContext.length, newTab);
      setTimeout(() => {
        tabCtx[1]("focusedTab", newTab.tab.id);
      });
    }
    setRender(true);
  };

  createEffect(
    on(
      () => recentConfigFilePaths(),
      async () => {
        const store = await load("store.json", {
          defaults: {
            configFilePath: undefined,
            logFilePath: undefined,
            ipHistory: undefined,
          },
          autoSave: false,
        });
        store.set("configFilePath", recentConfigFilePaths());
      },
      { defer: true },
    ),
  );

  const openFile = async (tabStoreKey: string, path: string) => {
    try {
      const fileHandler = new FileHandler();
      const file = await fileHandler.readFile(path, configFormFileFormat());
      const parsePath = path.replaceAll("\\", "/").split("/").pop()!;
      createNewTab(tabStoreKey, file as ConfigType, parsePath, undefined, path);
      setRecentConfigFilePaths((prev) => {
        return [path, ...prev.filter((prevPath) => prevPath !== path)];
      });
    } catch {
      toaster.create({
        title: "Invalid File",
        description: "The file is invalid.",
        type: "error",
      });
      setRecentConfigFilePaths((prev) => {
        const newRecentFiles = prev.filter(
          (prevFilePath) => prevFilePath !== path,
        );
        return newRecentFiles;
      });
      return;
    }
  };

  return (
    <>
      <Show when={render()}>
        <PanelLayout id={Pages.Configuration}>
          <Panel>
            <TabList
              onCreateTab={(tabStoreKey) => {
                createNewTab(
                  tabStoreKey,
                  JSON5.parse(
                    JSON5.stringify(configFormFileFormat()),
                  ) as ConfigType,
                  "New File",
                );
              }}
            >
              <ConfigTabContent />
            </TabList>
          </Panel>
        </PanelLayout>
      </Show>
    </>
  );
}

export default Configuration;
