import "@spectrum-css/tokens/dist/css/global-vars.css";
import "@spectrum-css/tokens/dist/css/spectrum/custom-vars.css";
import "@spectrum-css/tokens/dist/css/spectrum/medium-vars.css";
import "@spectrum-css/tokens/dist/css/medium-vars.css";
import "@spectrum-css/tokens/dist/css/light-vars.css";
import "@spectrum-css/page/dist/index-vars.css";
import "@spectrum-css/link/dist/index-vars.css";
import "@spectrum-css/table/dist/index-vars.css";
import "@spectrum-css/typography/dist/index-vars.css";
import "@spectrum-css/sidenav/dist/index-vars.css";

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
