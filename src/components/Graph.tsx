import { onMount } from "solid-js";

import * as echarts from "echarts";

// import { Badge } from "~/components/ui/badge";

type GraphProps = {
  id: string;
  name: string;
};

export function Graph(props: GraphProps) {
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
