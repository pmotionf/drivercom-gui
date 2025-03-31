import { DragOptions } from "@neodrag/solid";
import "solid-js";

declare module "solid-js" {
  namespace JSX {
    interface Directives {
      dragOptions: DragOptions;
    }
  }
}
