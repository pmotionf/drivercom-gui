import { JSX } from "solid-js/jsx-runtime";
import { Show } from "solid-js/web";
import { For } from "solid-js/web";
import { Splitter } from "~/components/ui/splitter.tsx";
import { Panel } from "~/components/Panel.tsx";
import { tabLocation } from "./TabList.tsx";
import { createStore } from "solid-js/store";

export type panelContext = {
  id: string;
  size: number;
};

export type panelLayoutProps = JSX.HTMLAttributes<HTMLDivElement> & {
  size: panelContext[];
  onSizeChange?: (size: panelContext[]) => void;
  panelContext: object[];
  onPanelContextChange?: (newContext: object[]) => void;
};

export function PanelLayout(props: panelLayoutProps) {
  const [panels, setPanels] = createStore<object[]>(props.panelContext);
  const [panelSize, setPanelSize] = createStore<panelContext[]>(props.size);
  const splitTab = (
    location: tabLocation,
    index: number,
    draggedTab: object,
    panels: object[],
  ): { updatePanel: object[]; updateSize: panelContext[] } => {
    const panelIndex = location === "rightSplitter" ? index + 1 : index;
    const uuid = getCryptoUUID();
    const newPanel = [
      {
        id: uuid,
        tabContext: draggedTab,
        focusedTab: draggedTab["id" as keyof typeof draggedTab],
      },
    ];
    const deleteDraggedTab = panels.map((panel, i) => {
      if (index !== i) return panel;
      else {
        const tabContext: object[] = ["tabContext" as keyof typeof panel];
        return {
          id: panel["id" as keyof typeof panel],
          tabContext: tabContext.filter(
            (ctx) =>
              ctx["id" as keyof typeof ctx] !==
              draggedTab["id" as keyof typeof draggedTab],
          ),
          focusedTab: draggedTab["id" as keyof typeof draggedTab],
        };
      }
    });
    const updatePanels = [
      ...deleteDraggedTab.slice(0, panelIndex),
      newPanel,
      ...deleteDraggedTab.slice(panelIndex),
    ];

    const updateSizes = updatePanels.map((panel) => {
      const id = panel["id" as keyof typeof panel];
      const size = 100 / updatePanels.length;
      return {
        id: id,
        size: size,
      };
    });
    console.log(newPanel);
    return { updatePanel: updatePanels, updateSize: updateSizes };
  };

  function getCryptoUUID(): string {
    const uuid: string = crypto.randomUUID();
    return uuid;
  }
  return (
    <>
      <Splitter.Root
        size={panelSize}
        gap="0.5"
        onSizeChange={(panelDetails) => {
          const parseSizeData = panelDetails.size.map((info) => {
            return { id: info.id.toString(), size: Number(info.size) };
          });
          props.onSizeChange?.(parseSizeData);
        }}
      >
        <For each={panels}>
          {(currentPanel, index) => {
            const panelId: string =
              currentPanel["id" as keyof typeof currentPanel];
            const prevPanel: object | null =
              index() === 0 ? null : props.panelContext[index() - 1];
            const prevPanelId =
              prevPanel === null
                ? ""
                : prevPanel["id" as keyof typeof prevPanel];
            return (
              <>
                <Show when={index() !== 0}>
                  <Splitter.ResizeTrigger
                    id={`${prevPanelId}:${panelId}`}
                    width="4px"
                    padding="0"
                    opacity="0%"
                    transition="opacity 0.3s ease"
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.opacity = "100%")
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0%")}
                  />
                </Show>
                <Splitter.Panel id={panelId}>
                  <Panel
                    id={panelId}
                    panelContext={currentPanel}
                    onSplitTab={(tabLocation: tabLocation, draggedTab) => {
                      if (
                        tabLocation === "leftSplitter" ||
                        tabLocation === "rightSplitter"
                      ) {
                        const updateTabs = splitTab(
                          tabLocation,
                          index(),
                          draggedTab,
                          props.panelContext,
                        );
                        setPanels(updateTabs.updatePanel);
                        setPanelSize(updateTabs.updateSize);
                      }
                    }}
                  />
                </Splitter.Panel>
              </>
            );
          }}
        </For>
      </Splitter.Root>
    </>
  );
}
