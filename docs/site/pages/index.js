import { getSortedComponentsData, getComponentSchemasVersion } from "../lib/components";
import Link from "next/link";
import Head from "next/head";

export async function getStaticProps() {
  const allComponentsData = await getSortedComponentsData();
  const version = await getComponentSchemasVersion();
  return {
    props: {
      allComponentsData,
      version,
    },
  };
}

export default function Home({ allComponentsData, version }) {
  return (
    <div>
      <Head>
        <title>Spectrum Components API</title>
        <meta name="description" content="API documentation for Spectrum, Adobe's design system" />
        <link rel="icon" type="image/png" href="/favicon.png" />
      </Head>

      <main>
        <section>
          <h1>Spectrum Components API</h1>
          {version && (
            <p style={{ fontSize: "0.875rem", color: "#6e6e6e", margin: "0.5rem 0" }}>
              Schema version: {version}
            </p>
          )}
          <nav>
            <ul className="spectrum-SideNav">
              {allComponentsData.map(({ slug, title }) => (
                <li className="spectrum-SideNav-item" key={slug}>
                  <Link className="spectrum-SideNav-itemLink" href={`/components/${slug}`}>
                    <span className="spectrum-SideNav-link-text">{title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </section>
      </main>
    </div>
  );
}
