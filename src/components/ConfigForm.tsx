import { For, JSX, splitProps } from "solid-js";
import { Accordion } from "~/components/ui/accordion";
import { FormLabel } from "~/components/ui/form-label";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import { IconChevronDown } from "@tabler/icons-solidjs";

export type ConfigFormProps = JSX.HTMLAttributes<HTMLFormElement> & {
  label: string;
  config: object;
}

export function ConfigForm(props: ConfigFormProps) {
  const [, rest] = splitProps(props, ["config"]);

  return (
    <form {...rest}>
        <fieldset style={{
          "border-width": "1px",
          "padding": "0.5em",
          "padding-top": "0.2em",
        }}>
          <legend>
            <FormLabel>
              {props.label}
            </FormLabel>
          </legend>
      <ConfigObject object={props.config} id_prefix={props.label} />
      </fieldset>
    </form>
  );
}

type ConfigObjectProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id_prefix: string;
  object: object;
}

function ConfigObject(props: ConfigObjectProps) {
  const [, rest] = splitProps(props, ["id_prefix", "object"]);

  return (
    <div {...rest}>
    <For each={Object.entries(props.object)}>
      {(entry) => {
        const key = entry[0];
        const value = entry[1];
        if (value.constructor === Array) {
          return <ConfigList label={key} list={value} id_prefix={props.id_prefix} />;
        }
        if (typeof value === "object") {
          return (
            <fieldset style={{
              "border-width": "1px",
              "padding": "0.5em",
              "padding-top": "0.2em",
              "margin-bottom": "0.2em",
            }}>
              <legend>
                <FormLabel>
                  {key}
                </FormLabel>
              </legend>
              <ConfigObject object={value} id_prefix={props.id_prefix + key} style={{"padding-left": "1em"}}/>
            </fieldset>
          );
        }
        if (typeof value === "boolean") {
          return (
            <FormLabel style={{
              display: "flex", 
              "align-content": "center", 
              "line-height": "1.75em",
              "justify-content": "space-between",
            }}>
              {key}
              <Switch id={props.id_prefix + key} />
            </FormLabel>
          );
        }
        if (typeof value === "number") {
          return (
            <FormLabel style={{
              display: "flex", 
              "align-content": "center", 
              "line-height": "3em",
              "justify-content": "space-between",
            }}>
              {key}
              <Input id={props.id_prefix + key} style={{"margin-left": "1em"}}/>
            </FormLabel>
          )
        }
      }}
    </For>
    </div>
  );
}

type ConfigListProps = Accordion.RootProps & {
  id_prefix: string;
  label: string;
  list: any[];
}

function ConfigList(props: ConfigListProps) {
  const [, rest] = splitProps(props, ["list"]);

  console.log(props.list);

  return (
    <Accordion.Root multiple {...rest}>
      <For each={props.list}> 
        {(item, index) => {
          const title = props.label + " " + (index() + 1).toString();
          return (
            <Accordion.Item value={props.id_prefix + title}>
              <Accordion.ItemTrigger>
                {title}
                <Accordion.ItemIndicator>
                  <IconChevronDown />
                </Accordion.ItemIndicator>
              </Accordion.ItemTrigger>
              <Accordion.ItemContent>
                <ConfigObject object={item} id_prefix={props.id_prefix + title}/>
              </Accordion.ItemContent>
            </Accordion.Item>
          );
        }}
      </For>
    </Accordion.Root>
  );
}
