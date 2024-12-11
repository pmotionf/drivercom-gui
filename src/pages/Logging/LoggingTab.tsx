import { trackStore } from "@solid-primitives/deep";
import { createEffect, createSignal, For, JSX } from "solid-js";
import { createStore } from "solid-js/store";
import { Plot, PlotContext } from "~/components/Plot";
import { Button } from "~/components/ui/button";

export type LoggingTabProps = JSX.HTMLAttributes<HTMLDivElement> & {
  tabId: string;
  logName: string;
  header: string[];
  series: number[][];
  splitIndex: number[][];
};

export function LoggingTab(props: LoggingTabProps) {
  const [plots, setPlots] = createStore([] as PlotContext[]);
  const [splitIndex, setSplitIndex] = createSignal(props.splitIndex);

  function resetChart() {
    const indexArray = Array.from(
      { length: props.header.length },
      (_, index) => index,
    );
    setSplitIndex([indexArray]);
  }

  function splitPlot(plot_index: number) {
    const hiddens = plots[plot_index].visible.reduce(
      (filtered: number[], visible, index) => {
        if (!visible) {
          filtered.push(splitIndex()[plot_index][index]);
        }
        return filtered;
      },
      [],
    );
    const visibles = plots[plot_index].visible.reduce(
      (filtered: number[], visible, index) => {
        if (visible) {
          filtered.push(splitIndex()[plot_index][index]);
        }
        return filtered;
      },
      [],
    );

    setSplitIndex((prev) => {
      const updated = [...prev];
      updated.splice(plot_index, 1, visibles, hiddens);
      return updated;
    });
  }

  const allVisible = (index: number) => {
    trackStore(plots[index].visible);
    return plots[index].visible.every((b) => b);
  };
  const allInvisible = (index: number) => {
    trackStore(plots[index].visible);
    return plots[index].visible.every((b) => !b);
  };

  return (
    <>
      <Button
        variant="ghost"
        disabled={splitIndex().length <= 1}
        onclick={resetChart}
        style={{
          "margin-top": "0.5rem",
          "margin-left": "1rem",
        }}
      >
        Reset
      </Button>
      <For each={splitIndex()}>
        {(item, index) => {
          // Header and items need not be derived state, as they will not
          // change within a plot.
          const currentHeader = item.map((i) => props.header[i]);
          const currentItems = item.map((i) => props.series[i]);

          // Current ID must be derived state as index can change based on
          // added/merged plots.
          const currentID = () => props.tabId + index();

          // Re-render plot contexts every time `splitIndex` is changed.
          // TODO: Do not always initialize as empty, figure out how to save
          // existing state and update for index changes.
          createEffect(() => {
            setPlots(index(), {} as PlotContext);
          });

          return (
            <>
              <Button
                onClick={() => splitPlot(index())}
                disabled={currentHeader.length <= 1 ||
                  !plots[index()] ||
                  !plots[index()].visible ||
                  allVisible(index()) ||
                  allInvisible(index())}
                style={{
                  "margin-left": "1rem",
                  "margin-top": `${index() == 0 ? "0.5rem" : "0px"}`,
                }}
              >
                Split Plot
              </Button>
              <Plot
                id={currentID()}
                group={props.tabId}
                name=""
                header={currentHeader}
                series={currentItems}
                context={plots[index()]}
                style={{
                  width: "100%",
                  height: `calc(100% / ${splitIndex().length} - 3rem`,
                  "min-height": "18rem",
                }}
              />
            </>
          );
        }}
      </For>
    </>
  );
}
