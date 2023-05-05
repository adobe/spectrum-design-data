import Head from "next/head";
import Layout from "../../components/layout";
import { getAllComponentSlugs, getComponentData } from "../../lib/components";

function formatComponentPropertiesTable(componentData) {
  const properties = componentData.properties;
  return Object.keys(properties).map((property) => {
    const result = { property, ...properties[property] };
    if (Object.hasOwn(properties[property], "type")) {
      switch (properties[property].type) {
        case "boolean":
          result.values = "yes / no";
          result.defaultValue = properties[property].default ? "yes" : "no";
          break;
        case "string":
          if (property === "icon") {
            result.values = "icon / nothing";
            result.defaultValue = "nothing";
          } else if (Object.hasOwn(properties[property], "enum")) {
            result.values = properties[property].enum.join(" / ");
            result.defaultValue = properties[property].default
              ? properties[property].default
              : "";
          } else {
            result.values = "text";
            result.defaultValue = "-";
          }
          break;
        default:
          result.values = "yes / no";
          result.description = "";
          result.defaultValue = "no";
          result.required = "no";
      }
    }
    return result;
  });
}

export async function getStaticProps({ params }) {
  const componentData = await getComponentData(params.slug);
  return {
    props: {
      componentData,
    },
  };
}

export async function getStaticPaths() {
  const paths = await getAllComponentSlugs();
  return {
    paths,
    fallback: false,
  };
}

export default function Component({ componentData }) {
  return (
    <Layout>
      <Head>
        <title>{componentData.title}</title>
      </Head>
      <h1>{componentData.title}</h1>
      <p>{componentData.description}</p>
      {Object.hasOwn(componentData, "properties") ? (
        <table className="spectrum-Table spectrum-Table--sizeM spectrum-Table--quiet">
          <thead className="spectrum-Table-head">
            <tr>
              <th
                className="spectrum-Table-headCell"
                aria-sort="descending"
                tabIndex="0"
              >
                Property
              </th>
              <th className="spectrum-Table-headCell" aria-sort="none">
                Values
              </th>
              <th className="spectrum-Table-headCell">Default value</th>
              <th className="spectrum-Table-headCell">Required</th>
            </tr>
          </thead>
          <tbody className="spectrum-Table-body">
            {formatComponentPropertiesTable(componentData).map(
              ({ values, description, property, defaultValue, required }) => (
                <tr className="spectrum-Table-row" key={property}>
                  <td className="spectrum-Table-cell" tabIndex="0">
                    <strong>
                      {property.replace(/([A-Z])/g, " $1").toLowerCase()}
                    </strong>
                  </td>
                  <td className="spectrum-Table-cell" tabIndex="0">
                    <div>{values}</div>
                    {description ? (
                      <div className="description">{description}</div>
                    ) : undefined}
                  </td>
                  <td className="spectrum-Table-cell" tabIndex="0">
                    {defaultValue}
                  </td>
                  <td className="spectrum-Table-cell" tabIndex="0">
                    {required}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      ) : undefined}
      <pre>{JSON.stringify(componentData, null, 2)}</pre>
    </Layout>
  );
}
