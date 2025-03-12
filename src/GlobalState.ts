import { createContext, createSignal } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";
import { LogViewerPanelContext, LogViewerTabContext } from "./pages/LogViewer";

const [globalState, setGlobalState] = createStore({
  theme: "light",
} as GlobalState);
export { globalState, setGlobalState };

export type Theme = "light" | "dark";

export type GlobalState = {
  theme: Theme;
};

export const GlobalStateContext = createContext<{
  globalState: GlobalState;
  setGlobalState: SetStoreFunction<GlobalState>;
}>();

export const [cliVersion, setCliVersion] = createSignal<string>("");
export const [driverComVersion, setDriverComVersion] = createSignal<string>("");

export const [portId, setPortId] = createSignal<string>("");
export const [portList, setPortList] = createSignal<string[]>([]);

export const [enumSeries, setEnumSeries] = createSignal<[string, string][]>([]);
export const [enumMappings, setEnumMappings] = createSignal<
  [string, [number, string][]][]
>([]);

export const [logFormFileFormat, setLogFormFileFormat] = createSignal({});
export const [configFormFileFormat, setConfigFormFileFormat] = createSignal({});

export const [recentLogFilePaths, setRecentLogFilePaths] = createSignal<
  string[]
>([]);
export const [recentConfigFilePaths, setRecentConfigFilePaths] = createSignal<
  string[]
>([]);

export const [logStartConditionList, setLogStartCoditionList] = createSignal<
  string[]
>([]);
export const [logStartCombinatorList, setLogStartCombinatorList] = createSignal<
  string[]
>([]);

export const [logViewerPanelContexts, setLogViewPanelContexts] = createSignal<
  {
    id: string;
    tabContext: LogViewerTabContext[];
    focusedTab: string | undefined;
  }[]
>([]);
export const [logViewerPanelSize, setLogViewPanelSize] = createSignal<
  LogViewerPanelContext[]
>([]);
