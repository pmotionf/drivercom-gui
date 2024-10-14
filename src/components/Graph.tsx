import { JSX, onMount, splitProps } from "solid-js";

import * as echarts from "echarts";

// import { Badge } from "~/components/ui/badge";

export type GraphSeries = {
  name: string,
  symbol: string,
  type: string,
  data: number[],
};

export type GraphProps = JSX.HTMLAttributes<HTMLDivElement> & {
  name: string;
  series: GraphSeries[],
};

export function Graph(props: GraphProps) {
  const [, rest] = splitProps(props, ["name", "series"]);

  onMount(() => {
    const parent = document.getElementById(props.id!);
    var graph = echarts.init(parent);
    var resize = new ResizeObserver((_) => {
      graph.resize();
    });
    resize.observe(parent!);
    graph.setOption({
      title: {
        text: props.name,
      },
      legend: {
        type: "scroll",
        orient: "vertical",
        align: "left",
        icon: "pin",
        left: "right",
        bottom: "5%",
      },
      toolbox: {
        top: "5%",
        right: "5%",
        feature: {
          dataZoom: {
            yAxisIndex: 'none',
          },
          restore: {}
        },
      },
      tooltip: {
        trigger: 'axis',
      },
      renderer: 'canvas',
      xAxis: {
        type: 'category',
      },
      yAxis: {
        type: 'value',
      },
      series: props.series,
    });
  });

  return <div {...rest}></div>;
}
