import { For, JSX } from "solid-js";
import { Text } from "~/components/ui/text";

export type LoggingFormProps = JSX.HTMLAttributes<Element> & {
  jsonfile: object;
};

export function LoggingForm(props: LoggingFormProps) {
  return (
    <For each={Object.entries(props.jsonfile)}>
      {(list) => (
        <Text>
          {list}
        </Text>
      )}
    </For>
  );
}
