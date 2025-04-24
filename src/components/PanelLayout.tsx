import { SplitterRoot } from "@ark-ui/solid";
import { JSX } from "solid-js/jsx-runtime";

export type panelContext = {
  id: string;
  size: number;
};

export type panelLayoutProps = JSX.HTMLAttributes<HTMLDivElement> & {
  size: panelContext[];
  onSizeChange?: (size: panelContext[]) => void;
  tabContext: object[];
};

export function PanelLayout(props: panelLayoutProps) {
  return (
    <>
      <SplitterRoot
        size={props.size}
        onSizeChange={(panelDetails) => {
          const newPanelContext = panelDetails.size.map((panel) => {
            return { id: panel.id.toString(), size: Number(panel.size) };
          });
        }}
      ></SplitterRoot>
    </>
  );
}
