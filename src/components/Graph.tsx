import { onMount } from "solid-js";

import * as echarts from "echarts";

import { Badge } from "~/components/ui/badge";

export function Graph(props) {
  onMount(() => {
    var graph = echarts.init(document.getElementById(props.id));
    graph.setOption({
      title: {
        text: props.name,
      },
    });
  });

  return <div id={props.id}></div>;
}
