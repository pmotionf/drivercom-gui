import { JSX } from "solid-js/jsx-runtime";
import { Show } from "solid-js/web";
import { For } from "solid-js/web";
import { Splitter } from "~/components/ui/splitter.tsx";
import { TabContext, TabLocation } from "./TabList.tsx";
import { createContext, createSignal, onMount } from "solid-js";
import { panelContexts, panelKeys, tabContexts } from "~/GlobalState.ts";
import { createStore } from "solid-js/store";
import { TabListContext } from "./TabList.tsx";
import { panelProps } from "./Panel.tsx";

export type PanelSizeContext = {
  id: string;
  size: number;
};

export type PanelLayoutProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
};

export const panelLayoutContext = createContext<panelProps>();

export function PanelLayout(props: PanelLayoutProps) {
  if (!panelKeys.has(props.id)) {
    const uuid = crypto.randomUUID();
    panelKeys.set(props.id, uuid);
    panelContexts.set(uuid, createSignal<PanelSizeContext[]>([]));
  }

  const getPanelKey = (): string => panelKeys.get(props.id)!;

  const setPanelContext = (key: string, updateContext: PanelSizeContext[]) => {
    panelContexts.get(key)?.[1](updateContext);
  };
  const getPanelContext = (key: string): PanelSizeContext[] => {
    const panelContext = panelContexts.get(key)![0]();
    return panelContext;
  };

  const getPanelId = (key: string): string[] =>
    getPanelContext(key).map((panel) => {
      return panel.id;
    });

  const [render, setRender] = createSignal<boolean>(false);
  onMount(() => {
    if (getPanelContext(getPanelKey()).length === 0) {
      const uuid = getCryptoUUID();
      setPanelContext(getPanelKey(), [{ id: uuid, size: 100 }]);
    }
    if (getPanelContext(getPanelKey()).length >= 1) {
      setRender(true);
    }
  });

  const splitTab = (
    location: TabLocation,
    index: number,
    panels: PanelSizeContext[],
  ): { panelContext: PanelSizeContext[]; nextTabListId: string } => {
    const panelIndex = location === "rightSplitter" ? index + 1 : index;
    const uuid = getCryptoUUID();

    const currentLength = panels.length + 1;
    const newSize = 100 / currentLength;

    const newPanel: PanelSizeContext = {
      id: uuid,
      size: newSize,
    };

    const newSizePanels = panels.map((panel) => {
      return {
        id: panel.id,
        size: newSize,
      };
    });

    const updatePanels = [
      ...newSizePanels.slice(0, panelIndex),
      newPanel,
      ...newSizePanels.slice(panelIndex),
    ];
    return { panelContext: updatePanels, nextTabListId: newPanel.id };
  };

  function getCryptoUUID(): string {
    const uuid: string = crypto.randomUUID();
    return uuid;
  }

  return (
    <Show when={render()}>
      <Splitter.Root
        size={getPanelContext(getPanelKey()).map((ctx) => ctx.size)}
        panels={getPanelContext(getPanelKey()).map((ctx) => {
          return { id: ctx.id };
        })}
        onResize={(resizeDetails) => {
          const size: number[] = resizeDetails.size;
          const ids = getPanelContext(getPanelKey()).map((ctx) => ctx.id);
          const updatedSizes: PanelSizeContext[] = size.map((num, i) => {
            return {
              id: ids[i],
              size: num,
            } as PanelSizeContext;
          });
          setPanelContext(getPanelKey(), updatedSizes);
        }}
        gap="0.5"
      >
        <For each={getPanelContext(getPanelKey()).map((ctx) => ctx.id)}>
          {(id, index) => {
            return (
              <>
                <Show when={index() !== 0}>
                  <Splitter.ResizeTrigger
                    id={`${getPanelId(getPanelKey())[index() - 1]}:${id}`}
                    width="4px"
                    padding="0"
                    opacity="0%"
                    transition="opacity 0.3s ease"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "100%";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "0%";
                    }}
                  />
                </Show>
                <panelLayoutContext.Provider
                  value={{
                    id: id,
                    key: getPanelKey(),
                    onDeletePanel: () => {
                      const currentPanel = getPanelContext(getPanelKey());
                      if (currentPanel.length > 1) {
                        setPanelContext(
                          getPanelKey(),
                          currentPanel.filter((_, i) => i !== index()),
                        );
                      }
                    },
                    onSplitTab: (tabLocation, draggedTab, mouseX) => {
                      if (
                        tabLocation === "leftSplitter" ||
                        tabLocation === "rightSplitter"
                      ) {
                        const newSplit = splitTab(
                          tabLocation,
                          index(),
                          getPanelContext(getPanelKey()),
                        );
                        tabContexts.set(
                          newSplit.nextTabListId,
                          createStore<TabListContext>({
                            tabContext: [draggedTab] as TabContext[],
                            focusedTab: draggedTab.tab.id,
                          }),
                        );
                        setPanelContext(getPanelKey(), newSplit.panelContext);
                      }

                      if (tabLocation === "otherPanel") {
                        let nextPanelIndex: number = 0;
                        getPanelContext(getPanelKey()).forEach((panel, i) => {
                          const panelElement = document.getElementById(
                            `tabs:${panel.id}`,
                          );

                          if (
                            panelElement!.offsetLeft < mouseX &&
                            mouseX <
                              panelElement!.offsetLeft +
                                panelElement!.offsetWidth
                          ) {
                            nextPanelIndex = i;
                          }
                        });

                        const nextPanelId =
                          getPanelContext(getPanelKey())[nextPanelIndex].id;
                        const prevTabContext =
                          tabContexts.get(nextPanelId)?.[0];
                        tabContexts.get(nextPanelId)?.[1]("tabContext", [
                          ...prevTabContext!.tabContext,
                          draggedTab,
                        ]);
                        tabContexts.get(nextPanelId)?.[1](
                          "focusedTab",
                          draggedTab.tab.id,
                        );
                      }
                    },
                  }}
                >
                  {props.children}
                </panelLayoutContext.Provider>
              </>
            );
          }}
        </For>
      </Splitter.Root>
    </Show>
  );
}
