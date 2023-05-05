import "@spectrum-css/tokens/dist/css/global-vars.css";
import "@spectrum-css/tokens/dist/css/medium-vars.css";
import "@spectrum-css/tokens/dist/css/light-vars.css";
import "@spectrum-css/page/dist/index-vars.css";

import "@spectrum-css/vars/dist/spectrum-global.css";
import "@spectrum-css/vars/dist/spectrum-medium.css";
import "@spectrum-css/vars/dist/spectrum-light.css";
import "@spectrum-css/typography/dist/index-vars.css";
import "@spectrum-css/sidenav/dist/index-vars.css";

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
