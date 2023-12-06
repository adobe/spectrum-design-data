import Head from "next/head";
import Link from "next/link";

export const siteTitle = "Spectrum Components API";

export default function Layout({ children, home }) {
  return (
    <div>
      <Head>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <meta
          name="description"
          content="API documentation for components options in Spectrum, Adobe's design system"
        />
        <meta
          property="og:image"
          name="twitter:image"
          content="https://spectrum.adobe.com/static/landscape-2.png"
        />
        <meta name="og:title" content={siteTitle} />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      <header>
        <h2>
          <Link href="/">{siteTitle}</Link>
        </h2>
      </header>
      <main>{children}</main>
      {!home && (
        <div>
          <Link href="/">← Back to home</Link>
        </div>
      )}
    </div>
  );
}
