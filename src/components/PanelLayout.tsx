import { JSX } from "solid-js/jsx-runtime";
import { Show } from "solid-js/web";
import { For } from "solid-js/web";
import { Splitter } from "~/components/ui/splitter.tsx";
import { Panel } from "~/components/Panel.tsx";

export type panelContext = {
  id: string;
  size: number;
};

export type panelLayoutProps = JSX.HTMLAttributes<HTMLDivElement> & {
  size: panelContext[];
  onSizeChange?: (size: panelContext[]) => void;
  panelContext: object[];
};

export function PanelLayout(props: panelLayoutProps) {
  console.log("panelLayout");
  return (
    <>
      <Splitter.Root
        size={props.size}
        gap="0.5"
        onSizeChange={(panelDetails) => {
          const parseSizeData = panelDetails.size.map((info) => {
            return { id: info.id.toString(), size: Number(info.size) };
          });
          props.onSizeChange?.(parseSizeData);
        }}
      >
        <For each={props.size && props.panelContext}>
          {(currentPanel, index) => {
            const panelId: string =
              currentPanel["id" as keyof typeof currentPanel];
            const prevPanel: object | null = index() === 0
              ? null
              : props.panelContext[index() - 1];
            const prevPanelId = prevPanel === null
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
                    onMouseEnter={(
                      e,
                    ) => (e.currentTarget.style.opacity = "100%")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0%")}
                  />
                </Show>
                <Splitter.Panel id={panelId}>
                  <Panel
                    id={panelId}
                    tabContext={currentPanel}
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
