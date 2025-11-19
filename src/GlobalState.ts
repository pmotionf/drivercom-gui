import { Accessor, createContext, createSignal, Setter } from "solid-js";
import { createStore, SetStoreFunction, Store } from "solid-js/store";
import { PanelSizeContext } from "./components/PanelLayout.tsx";
import { TabListContext } from "./components/TabList.tsx";
import { Child } from "@tauri-apps/plugin-shell";
import { LoggingFormType } from "./pages/Logging.tsx";
import { DownloadStates } from "./components/DownloadList.tsx";

const [globalState, setGlobalState] = createStore({
  theme: "light",
} as GlobalState);
export { globalState, setGlobalState };

export type Theme = "light" | "dark";

export type GlobalState = {
  theme: Theme;
};

export type Port = {
  id: string;
  version: string;
};

export const GlobalStateContext = createContext<{
  globalState: GlobalState;
  setGlobalState: SetStoreFunction<GlobalState>;
}>();

export const [cliVersion, setCliVersion] = createSignal<string>("");
export const [driverComVersion, setDriverComVersion] = createSignal<string>("");

export const [portId, setPortId] = createSignal<string>("");
export const [portList, setPortList] = createSignal<Port[]>([]);

export const [logFormFileFormat, setLogFormFileFormat] = createSignal({});
export const [configFormFileFormat, setConfigFormFileFormat] = createSignal({});

export const [recentLogFilePaths, setRecentLogFilePaths] = createSignal<
  string[]
>([]);
export const [recentConfigFilePaths, setRecentConfigFilePaths] = createSignal<
  string[]
>([]);

export const [logStartConditionList, setLogStartConditionList] = createSignal<
  string[]
>([]);
export const [logStartCombinatorList, setLogStartCombinatorList] = createSignal<
  string[]
>([]);

type PageKeys = Map<string, string>;
export const pageKeys: PageKeys = new Map();

type PanelContexts = Map<
  string,
  [Accessor<PanelSizeContext[]>, Setter<PanelSizeContext[]>]
>;
export const panelContexts: PanelContexts = new Map();

type TabContexts = Map<
  string,
  [Store<TabListContext>, SetStoreFunction<TabListContext>]
>;
export const tabContexts: TabContexts = new Map();

export enum Pages {
  Configuration = "configuration",
  Logging = "logging",
  LogViewer = "logViewer",
  Monitoring = "monitoring",
  None = "none",
}

export const [page, setPage] = createSignal<Pages>(Pages.None);

export type MonitoringInputs = Map<string, [Accessor<string>, Setter<string>]>;
export const monitoringInputs: MonitoringInputs = new Map();

export type PortCommand = {
  port: string;
  child: Child;
};

export const portCommands: Map<number, PortCommand> = new Map();

export const [logForm, setLogForm] = createStore<LoggingFormType>({
  title: "New file",
  filePath: "",
  logConfig: {},
  accordionStates: new Map(),
});

export const [csvFileDownloads, setCsvFileDownloads] = createStore<
  DownloadStates[]
>([]);
