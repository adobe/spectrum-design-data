import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
  return (
    <Html
      lang="en-US"
      dir="ltr"
      className='spectrum spectrum--medium spectrum--light'
    >
      <Head>
        <Script src='/typekit.js' />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
