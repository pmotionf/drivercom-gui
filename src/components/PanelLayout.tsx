import { JSX } from "solid-js/jsx-runtime";
import { Show } from "solid-js/web";
import { For } from "solid-js/web";
import { Splitter } from "~/components/ui/splitter.tsx";
import { Panel } from "~/components/Panel.tsx";
import { TabLocation } from "./TabList.tsx";
import { createSignal, onMount } from "solid-js";
import { panelContexts, panelKeys, tabContexts } from "~/GlobalState.ts";
import { createStore } from "solid-js/store";
import { TabListContext } from "./TabList.tsx";
import { TabContext } from "./Tab.tsx";

export type PanelSizeContext = {
  id: string;
  size: number;
};

export type PanelLayoutProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
};

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
        size={getPanelContext(getPanelKey())}
        gap="0.5"
        onSizeChange={(details: { size: object[] }) => {
          const parseDetails: PanelSizeContext[] = details.size.map((info) => {
            return {
              id: info["id" as keyof typeof info],
              size: info["size" as keyof typeof info],
            } as PanelSizeContext;
          });
          setPanelContext(getPanelKey(), parseDetails);
        }}
      >
        <For each={getPanelId(getPanelKey())}>
          {(currentPanel, index) => {
            return (
              <>
                <Show when={index() !== 0}>
                  <Splitter.ResizeTrigger
                    id={`${
                      getPanelId(getPanelKey())[index() - 1]
                    }:${currentPanel}`}
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
                <Panel
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                  id={currentPanel}
                  key={getPanelKey()}
                  onDeletePanel={() => {
                    const currentPanel = getPanelContext(getPanelKey());
                    if (currentPanel.length > 1) {
                      setPanelContext(
                        getPanelKey(),
                        currentPanel.filter((_, i) => i !== index()),
                      );
                    }
                  }}
                  onSplitTab={(
                    tabLocation: TabLocation,
                    draggedTab,
                    mouseX,
                  ) => {
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
                          focusedTab: draggedTab.id,
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
                            panelElement!.offsetLeft + panelElement!.offsetWidth
                        ) {
                          nextPanelIndex = i;
                        }
                      });

                      const nextPanelId =
                        getPanelContext(getPanelKey())[nextPanelIndex].id;
                      const prevTabContext = tabContexts.get(nextPanelId)?.[0];
                      tabContexts.get(nextPanelId)?.[1]("tabContext", [
                        ...prevTabContext!.tabContext,
                        draggedTab,
                      ]);
                      tabContexts.get(nextPanelId)?.[1](
                        "focusedTab",
                        draggedTab.id,
                      );
                    }
                  }}
                />
              </>
            );
          }}
        </For>
      </Splitter.Root>
    </Show>
  );
}
