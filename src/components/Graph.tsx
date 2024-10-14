import { JSX, onMount, splitProps } from "solid-js";

import * as echarts from "echarts";

// import { Badge } from "~/components/ui/badge";

export type GraphSeries = {
  name: string;
  symbol: string;
  type: string;
  data: number[];
};

export type GraphProps = JSX.HTMLAttributes<HTMLDivElement> & {
  name: string;
  series: GraphSeries[];
};

export function Graph(props: GraphProps) {
  const [, rest] = splitProps(props, ["name", "series"]);

  onMount(() => {
    const parent = document.getElementById(props.id!);
    var graph = echarts.init(parent);
    var resize = new ResizeObserver((_) => {
      // Prevent rapid graph flickering due to resize with timeout.
      setTimeout(function () {
        graph.resize();
      }, 200);
    });
    resize.observe(parent!);
    graph.setOption({
      title: {
        show: false,
        text: props.name,
      },
      grid: {
        left: "40em",
      },
      legend: {
        type: "scroll",
        orient: "vertical",
        align: "left",
        icon: "pin",
        animation: false,
        left: "right",
        bottom: "5%",
      },
      toolbox: {
        top: "50em",
        right: "5em",
        feature: {
          saveAsImage: {},
          animation: false,
          dataZoom: {
            yAxisIndex: false,
          },
          restore: {},
        },
      },
      tooltip: {
        show: true,
        trigger: "item",
        triggerOn: "mousemove",
        axisPointer: {
          type: "cross",
          snap: true,
          animation: false,
        },
      },
      renderer: "canvas",
      xAxis: {
        type: "category",
      },
      yAxis: {
        type: "value",
      },
      series: props.series,
    });
  });

  return <div {...rest}></div>;
}
