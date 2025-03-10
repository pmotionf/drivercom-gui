import { createContext, createSignal } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";
import { PlotContext } from "~/components/Plot";

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

export type TabContext = {
  id: string;
  filePath: string;
  plotSplitIndex: number[][];
  plotContext: PlotContext[];
  tabName: string;
  plotZoomState: [number, number];
};
export const [logViewerPanelContexts, setLogViewPanelContexts] = createSignal<
  {
    id: string;
    tabContext: TabContext[];
    focusedTab: string | undefined;
  }[]
>([]);
export const [logViewerPanelSize, setLogViewPanelSize] = createSignal<
  { id: string; size: number }[]
>([]);
