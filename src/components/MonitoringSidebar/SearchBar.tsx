import { IconSearch } from "@tabler/icons-solidjs";
import { For, createSignal, on, createEffect, Show } from "solid-js";
import { Combobox, createListCollection } from "~/components/ui/combobox";
import { IconButton } from "~/components/ui/icon-button";
import { Input } from "~/components/ui/input";
import uFuzzy from "@leeoniya/ufuzzy";

export type SearchBarProps = {
  data: string[];
  label: string;
  onCommit?: (value: string) => void;
};

export const SearchBar = (props: SearchBarProps) => {
  const parseData = (
    datas: string[],
  ): {
    label: string;
    value: string;
    disabled?: boolean;
  }[] =>
    datas.map((data) => {
      return { label: data, value: data };
    });

  createEffect(
    on(
      () => props.data,
      () => {
        setItems(parseData(props.data));
      },
      { defer: true },
    ),
  );

  const [items, setItems] = createSignal<
    {
      label: string;
      value: string;
      disabled?: boolean;
    }[]
  >(parseData(props.data));
  const [collection, setCollection] = createSignal(
    createListCollection({ items: parseData(props.data) }),
  );

  createEffect(
    on(
      () => inputValue(),
      () => {
        searchData(inputValue(), props.data);
        setCollection(createListCollection({ items: items() }));
      },
    ),
  );

  const searchData = (input: string, data: string[]) => {
    const findInput = data.findIndex(
      (data) => data.toLowerCase() === input.toLowerCase(),
    );
    if (findInput !== -1) {
      setComboBoxValue([data[findInput]]);
      return;
    }
    const inputValue = input.toLowerCase();
    const searchedResult =
      input.length === 0 ? data : fuzzySearch(inputValue, data);
    const newItems = parseData(searchedResult);
    setItems(newItems);
  };

  function fuzzySearch(searchInputValue: string, headers: string[]): string[] {
    const uf = new uFuzzy({});
    // Pre-filter
    const idxs = uf.filter(headers, searchInputValue);

    if (idxs != null && idxs.length > 0) {
      const info = uf.info(idxs, headers, searchInputValue);
      const order = uf.sort(info, headers, searchInputValue);
      const result = [];
      for (let i = 0; i < order.length; i++) {
        result.push(headers[idxs[i]]);
      }
      return result;
    } else {
      return [];
    }
  }

  const [inputValue, setInputValue] = createSignal<string>("");
  const [comboBoxValue, setComboBoxValue] = createSignal<string[]>([]);

  createEffect(
    on(
      () => comboBoxValue(),
      () => {
        if (comboBoxValue().length > 0) {
          setInputValue("");
          props.onCommit?.(comboBoxValue()[0]);
          setComboBoxValue([]);
        }
      },
    ),
  );

  return (
    <Combobox.Root
      inputValue={inputValue()}
      value={comboBoxValue()}
      onValueChange={(details) => {
        setComboBoxValue(details.value);
      }}
      width="xs"
      onInputValueChange={(e) => setInputValue(e.inputValue)}
      collection={collection()}
    >
      <Combobox.Label>{props.label}</Combobox.Label>
      <Combobox.Control>
        <Combobox.Input
          height="2em"
          marginRight={"9rem"}
          style={{
            width: "100% - 3rem",
          }}
          asChild={(inputProps) => (
            <Input
              width={`100% - 4rem`}
              overflow="hidden"
              textOverflow="ellipsis"
              {...inputProps()}
            />
          )}
        />
        <Combobox.Trigger
          asChild={(triggerProps) => (
            <IconButton
              variant="link"
              aria-label="open"
              size="xs"
              {...triggerProps()}
            >
              <IconSearch />
            </IconButton>
          )}
        />
      </Combobox.Control>
      <Show when={items().length > 0}>
        <Combobox.Positioner>
          <Combobox.Content>
            <Combobox.ItemGroup>
              <For each={items()}>
                {(item) => (
                  <Combobox.Item item={item} fontSize={"sm"}>
                    <Combobox.ItemText
                      fontWeight="medium"
                      textOverflow={"ellipsis"}
                      width="100%"
                      overflow={"hidden"}
                    >
                      {item.label}
                    </Combobox.ItemText>
                  </Combobox.Item>
                )}
              </For>
            </Combobox.ItemGroup>
          </Combobox.Content>
        </Combobox.Positioner>
      </Show>
    </Combobox.Root>
  );
};
