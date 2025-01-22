import { For, JSX, Show } from "solid-js";
import { Stack } from "styled-system/jsx";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Field } from "~/components/ui/field";
import { Text } from "~/components/ui/text";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";

export type LoggingFormProps = JSX.HTMLAttributes<Element> & {
  jsonfile: object;
};

export function LoggingForm(props: LoggingFormProps) {
  /*const parseConfig = Object.entries(props.jsonfile)[1];
  const configObjectData = Object.entries(parseConfig[1]);*/
  const logForm = [props.jsonfile];

  return (
    <div style={{ "width": "50%" }}>
      <For each={Object.entries(props.jsonfile)}>
        {(list) => (
          <Field.Root>
            <Field.Label fontSize={"xl"}>
              {list[0]}
            </Field.Label>
            <Show when={typeof list[1] === "number"}>
              <Field.Input
                type={typeof list[1]}
                placeholder={typeof list[1]}
                value={list[1]}
              />
            </Show>
            <Show when={typeof list[1] === "object"}>
              <For each={Object.entries(list[1])}>
                {(valueName) => (
                  // axis, hall sensor
                  <Stack direction={"row"}>
                    <Show when={typeof valueName[1] === "boolean"}>
                      <Checkbox>
                        {`${list[0]} ${Number(valueName[0]) + 1}`}
                      </Checkbox>
                    </Show>
                    <Show when={typeof valueName[1] === "number"}>
                      <Text width={"20%"}>
                        {`${list[0]} ${Number(valueName[0]) + 1}`}
                      </Text>
                      <Field.Input
                        type={typeof valueName[1]}
                        placeholder={typeof valueName[1]}
                        value={Number(valueName[1])}
                      />
                    </Show>
                    <Show when={typeof valueName[1] === "object"}>
                      <Text>
                        test
                      </Text>
                    </Show>
                  </Stack>
                )}
              </For>
            </Show>
          </Field.Root>
        )}
      </For>
      <Button
        type="button"
        style={{
          float: "right",
          "margin-top": "1em",
        }}
        onClick={async () => {
          const json_str = JSON.stringify(logForm, null, "  ");
          const path = await save({
            filters: [
              {
                name: "JSON",
                extensions: ["json"],
              },
            ],
          });
          if (!path) {
            // TODO: Show error toast
            return;
          }
          const extension = path.split(".").pop();
          if (extension != "json") {
            // TODO: Show error toast
            return;
          }
          // TODO: Handle write promise error with toast
          await writeTextFile(path, json_str);
        }}
      >
        Save
      </Button>
    </div>
  );
}

export type parseObjectLogFormProps = JSX.HTMLAttributes<Element> & {
  parseObject: unknown;
};

export function parseObjectLogForm(props: parseObjectLogFormProps) {
  // find out a way to parse again of this object
  return (
    <Text>
      {typeof props.parseObject}
    </Text>
  );
}
