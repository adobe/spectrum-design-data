import { getSortedComponentsData } from "../lib/components";
import Link from "next/link";
import Head from "next/head";

export async function getStaticProps() {
  const allComponentsData = await getSortedComponentsData();
  return {
    props: {
      allComponentsData,
    },
  };
}

export default function Home({ allComponentsData }) {
  return (
    <div>
      <Head>
        <title>Spectrum Components API</title>
        <meta
          name="description"
          content="API documentation for Spectrum, Adobe's design system"
        />
        <link rel="icon" type="image/png" href="/favicon.png" />
      </Head>

      <main>
        <section>
          <h1>Spectrum Components API</h1>
          <nav>
            <ul className="spectrum-SideNav">
              {allComponentsData.map(({ slug, title }) => (
                <li className="spectrum-SideNav-item" key={slug}>
                  <Link
                    className="spectrum-SideNav-itemLink"
                    href={`/components/${slug}`}
                  >
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
