import { createContext, createSignal } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";

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

export const [portId, setPortId] = createSignal<string>("");
