import { JSX } from "solid-js";
import { createStore } from "solid-js/store";
import { TabList } from "./TabList.tsx";

export type panelProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
  tabContext: object;
  onFocusTabChange?: (tabId: string) => void;
};

export function Panel(props: panelProps) {
  const [panelContext] = createStore<object>(props.tabContext);
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <TabList
        tabListContext={panelContext}
      />
    </div>
  );
}
