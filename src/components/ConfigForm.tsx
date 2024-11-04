import { For, JSX, splitProps } from "solid-js";
import { createStore } from "solid-js/store";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { createSignal } from "solid-js";

import { Accordion } from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { FormLabel } from "~/components/ui/form-label";
import { Input } from "~/components/ui/input";

import { IconChevronDown, IconCircle, IconEdit } from "@tabler/icons-solidjs";
import { Show } from "solid-js";


export type ConfigFormProps = JSX.HTMLAttributes<HTMLFormElement> & {
  label: string;
  config: object;
};

export function ConfigForm(props: ConfigFormProps) {
  const [, rest] = splitProps(props, ["config"]);

  const [config] = createStore(props.config);

  return (
    <div>
    <form {...rest}>
      <fieldset
        style={{
          "border-width": "1px",
          padding: "0.5em",
          "padding-top": "0.2em",
          "float" : "left",
          "width" : "45%"
        }}
      >
        <legend>
          <FormLabel>{props.label}</FormLabel>
        </legend>
        <ConfigObject 
          object={config} 
          id_prefix={props.label} />
        <Button
          style={{
            float: "right",
            "margin-top": "1em",
          }}
          onClick={async () => {
            const json_str = JSON.stringify(config, null, "  ");
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
      </fieldset>
    </form>
    <form>
    <fieldset
      style={{
        "border-width": "1px",
        padding: "0.5em",
        "padding-top": "0.2em",
      }}
    >
      <legend>
        <FormLabel>{props.label}</FormLabel>
      </legend>
      <ConfigObject 
        object={[otherConfigList, otherConfigObject]} 
        id_prefix={props.label} />
      <Button
        style={{
          float: "right",
          "margin-top": "1em",
        }}
        onClick={async () => {
          const json_str = JSON.stringify([otherConfigList, otherConfigObject]);
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
    </fieldset>
    </form>
    </div>
  );
}

type ConfigObjectProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id_prefix: string;
  object: object;
};

function ConfigObject(props: ConfigObjectProps) {
  const [, rest] = splitProps(props, ["id_prefix", "object"]);

  const [object, setObject] = createStore(props.object);

  const [selectedItem, setSelectedItem] = createSignal<object | null >(null);
  const [label, setLabel] = createSignal<string>("")
  const [contextMenuPosition, setContextMenuPosition] = createSignal<{x: number; y: number;} | null>(null)

  const handleContextMenuRight = (event: MouseEvent, item: object, label: string) => {
    event.preventDefault();
    setSelectedItem(item);
    setLabel(label)
    setContextMenuPosition({x: event.pageX, y: event.pageY})
    document.addEventListener("click", handleCloseMenu)
  };

  const handleMoveRight = () => {
    const itemToMove = selectedItem()
    if(itemToMove){
      setOtherConfigObject((prevConfig) => {
        return [...prevConfig, { label: label(), objects: [itemToMove] }];
      });
      setLabel("")
      setSelectedItem(null)
      setContextMenuPosition(null)
    }
  
  }

  const handleCloseMenu = () => {
    setContextMenuPosition(null)

    document.removeEventListener("click", handleCloseMenu)
  }

  return (
    <div {...rest} id = {props.id_prefix}>
      <For each={Object.entries(object)}>
        {(entry) => {
          const key = entry[0];
          const value = entry[1];
          if (value.constructor === Array) {
            return (
              <ConfigList
                label={key}
                list={value}
                id_prefix={props.id_prefix}
              />
            );
          }
          if (typeof value === "object") {
            return (
              <fieldset
                style={{
                  "border-width": "1px",
                  padding: "0.5em",
                  "padding-top": "0.2em",
                  "margin-bottom": "0.2em",
                }}
                onContextMenu={(event) => {handleContextMenuRight(event, entry, key)}}
              >
                <legend>
                  <FormLabel>{key}</FormLabel>
                </legend>
                <ConfigObject
                  object={value}
                  id_prefix={props.id_prefix + key}
                  style={{ "padding-left": "1em" }}
                />
              </fieldset>
            );
          }
          if (typeof value === "boolean") {
            return (
              <FormLabel
                style={{
                  display: "flex",
                  "align-content": "center",
                  "line-height": "1.75em",
                  "justify-content": "space-between",
                }}
                onContextMenu={(event) => handleContextMenuRight(event, entry, key)}
              >
                {key}
                <Checkbox
                  id={props.id_prefix + key}
                  checked={object[key as keyof typeof object]}
                  onCheckedChange={(e) => {
                    setObject(
                      key as keyof typeof object,
                      // @ts-ignore
                      e.checked,
                    );
                  }}
                />
              </FormLabel>
            );
          }
          if (typeof value === "number") {
            return ( 
              <FormLabel
                style={{
                  display: "flex",
                  "align-content": "center",
                  "line-height": "3em",
                  "justify-content": "space-between",
                }}
              >
                {key}
                <Input
                  id={props.id_prefix + key}
                  value={object[key as keyof typeof object]}
                  onChange={(e) => {
                    setObject(
                      key as keyof typeof object,
                      // @ts-ignore
                      Number(e.target.value),
                    );
                  }}
                  style={{
                    "margin-left": "1em",
                    "min-width": "8em",
                    "max-width": "12em",
                  }}
                />``
              </FormLabel>
            );
          }
        }}
      </For>
      <Show when={contextMenuPosition()}>
      <div
        style={{
          position: "absolute",
          top: `${contextMenuPosition()!.y}px`,
          left: `${contextMenuPosition()!.x}px`,
          background: "white",
          border: "1px solid #ccc",
          "z-index": 1000,
          padding: "10px",
        }}
        onClick={handleCloseMenu}
      >
        <button onClick={handleMoveRight}>split</button>
      </div>
    </Show>
    </div>
  );
}

type ConfigListProps = Accordion.RootProps & {
  id_prefix: string;
  label: string;
  list: object[];
};

function ConfigList(props: ConfigListProps) {
  const [, rest] = splitProps(props, ["list"]);
  
  const [list] = createStore(props.list);

  const [selectedItem, setSelectedItem] = createSignal<object | null >(null);
  const [label, setLabel] = createSignal<string>("")
  const [contextMenuPosition, setContextMenuPosition] = createSignal<{x: number; y: number;} | null>(null)

  const handleContextMenuRight = (event: MouseEvent, item: object, label: string) => {
    event.preventDefault();
    setSelectedItem(item);
    setLabel(label)
    setContextMenuPosition({x: event.pageX, y: event.pageY})
    document.addEventListener("click", handleCloseMenu)
  };
  
  
  const handleMoveRight = () => {
    const itemToMove = selectedItem()
    if(itemToMove){
      setOtherConfigList(label(), itemToMove)
      setLabel("")
      setSelectedItem(null)
      setContextMenuPosition(null)
    }
  }

  const handleCloseMenu = () => {
    setContextMenuPosition(null)

    document.removeEventListener("click", handleCloseMenu)
  }

  return (
    <div>
    <Accordion.Root multiple {...rest}>
      <For each={list}>
        {(item, index) => {
          const title = props.label + " " + (index() + 1).toString();
          return (
            <Accordion.Item value={props.id_prefix + title}>
              <Accordion.ItemTrigger onContextMenu={(event) => {
                  handleContextMenuRight(event, item, title)
              }}>
                {title}
                <Accordion.ItemIndicator>
                  <IconChevronDown />
                </Accordion.ItemIndicator>
              </Accordion.ItemTrigger>
              <Accordion.ItemContent>
                <ConfigObject
                  object={item}
                  id_prefix={props.id_prefix + title}
                />
              </Accordion.ItemContent>
            </Accordion.Item>
          );
        }}
      </For>
    </Accordion.Root>
    <Show when={contextMenuPosition()}>
      <div
        style={{
          position: "absolute",
          top: `${contextMenuPosition()!.y}px`,
          left: `${contextMenuPosition()!.x}px`,
          background: "white",
          border: "1px solid #ccc",
          "z-index": 1000,
          padding: "10px",
        }}
        onClick={handleCloseMenu}
      >
        <button onClick={handleMoveRight}>split</button>
      </div>
    </Show>
   </div>
  )
   

};

const [otherConfigList, setOtherConfigList] = createStore<Record<string, object>>({});
const [otherConfigObject, setOtherConfigObject] = createStore<{ label: string; objects: object[] }[]>([]);


function otherConfigData() {
  const [,rest] = splitProps(otherConfigList, ["objects"]) 
  
  return (
    <>
    <For each = {[otherConfigList, otherConfigObject]}>
      {(object) => (
        <ConfigObject
        object={object}
        id_prefix={JSON.stringify(object)}
      />
      )}
    </For>
    </>
  )
}
