import { createSignal, JSX } from "solid-js";
import { Editable } from "~/components/ui/editable";

export type TabEditableProps = JSX.HTMLAttributes<HTMLElement> & {
  tabName: string;
  onTabNameChange?: (tabName: string) => void;
};

/// Editable tab name inside tab.
export function TabEditable(props: TabEditableProps) {
  const [tabName, setTabName] = createSignal(props.tabName);

  return (
    <Editable.Root
      defaultValue={tabName()}
      onValueCommit={(v) => {
        setTabName(v.value);
        props.onTabNameChange?.(tabName());
      }}
      activationMode="dblclick"
      paddingTop="0.1rem"
    >
      <Editable.Area>
        <Editable.Input />
        <Editable.Preview />
      </Editable.Area>
    </Editable.Root>
  );
}
