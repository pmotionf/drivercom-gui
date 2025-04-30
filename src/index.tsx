/* @refresh reload */
import "./index.css"; // Necessary for PandaCSS
import { lazy } from "solid-js";
import { render } from "solid-js/web";
import { Route, Router } from "@solidjs/router";

import App from "./App.tsx";
const Configuration = lazy(() => import("./pages/Configuration.tsx"));
const LogViewer = lazy(() => import("./pages/LogViewer.tsx"));
const Connect = lazy(() => import("./pages/Connect.tsx"));
const Logging = lazy(() => import("./pages/Logging.tsx"));

render(
  () => (
    <Router root={App}>
      <Route path="/configuration" component={Configuration} />
      <Route path="/logviewer" component={LogViewer} />
      <Route path="/connect" component={Connect} />
      <Route path="/logging" component={Logging} />
    </Router>
  ),
  document.getElementById("root") as HTMLElement,
);
