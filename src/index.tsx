/* @refresh reload */
import "./index.css"; // Necessary for PandaCSS
import { lazy } from "solid-js";
import { render } from "solid-js/web";
import { Route, Router } from "@solidjs/router";

import App from "./App";
const Configuration = lazy(() => import("./pages/Configuration"));
const Logging = lazy(() => import("./pages/Logging"));
const Connect = lazy(() => import("./pages/connect"))

render(
  () => (
    <Router root={App}>
      <Route path="/configuration" component={Configuration} />
      <Route path="/logging" component={Logging} />
      <Route path="/connect" component={Connect}/>
    </Router>
  ),
  document.getElementById("root") as HTMLElement,
);
