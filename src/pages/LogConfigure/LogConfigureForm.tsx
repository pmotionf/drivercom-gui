//import { Command } from "@tauri-apps/plugin-shell";
import { For, JSX } from "solid-js";
import { Text } from "~/components/ui/text";

export type LogConfigureFormProps = JSX.HTMLAttributes<Element> & {
  jsonfile: object;
};

export function LogConfigureForm(props: LogConfigureFormProps) {
  /*async function checkConfigList(){
        const sideCommand = Command.sidecar("binaries/drivercom", [
            "log.config",
          ]);
        const output = await sideCommand.execute();
        var logConfig = output.stdout.split('\n');
        console.log(logConfig)
    }*/

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
