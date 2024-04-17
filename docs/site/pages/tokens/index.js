import Head from "next/head";
import Link from "next/link";
import Layout from "../../components/layout";

import { getTokenData } from "../../lib/tokens";

function isObject(obj) {
  return typeof obj === "object" && !Array.isArray(obj) && obj !== null;
}

export async function getStaticProps({}) {
  const tokenData = await getTokenData();
  return {
    props: {
      tokenData,
    },
  };
}

function RGBAToHexA(rgba, forceRemoveAlpha = false) {
  return (
    "#" +
    rgba
      .replace(/^rgba?\(|\s+|\)$/g, "") // Get's rgba / rgb string values
      .split(",") // splits them at ","
      .filter((string, index) => !forceRemoveAlpha || index !== 3)
      .map((string) => parseFloat(string)) // Converts them to numbers
      .map((number, index) => (index === 3 ? Math.round(number * 255) : number)) // Converts alpha to 255 number
      .map((number) => number.toString(16)) // Converts numbers to hex
      .map((string) => (string.length === 1 ? "0" + string : string)) // Adds 0 when length of one number is 1
      .join("")
  ); // Puts the array to togehter to a string
}

// function formatTokenLink(value) {
//   if (value.charAt(0) === "{" && value.charAt(value.length - 1) === "}") {
//     return (
//       <Link
//         className="spectrum-Link"
//         href={`#${value.substring(1, value.length - 1)}`}
//       >{`${value.substring(1, value.length - 1)}`}</Link>
//     );
//   } else {
//     return value;
//   }
// }

// function formatSets(sets) {
//   if (Object.hasOwn(sets, "desktop") && Object.hasOwn(sets, "mobile")) {
//     if (
//       Object.hasOwn(sets.desktop, "value") &&
//       Object.hasOwn(sets.mobile, "value")
//     ) {
//       return (
//         <td className="spectrum-Table-cell" tabIndex="0">
//           {`${formatTokenLink(sets.desktop.value)} (desktop)`}
//           <br />
//           {`${formatTokenLink(sets.mobile.value)} (mobile)`}
//         </td>
//       );
//     } else {
//       return (
//         <td className="spectrum-Table-cell" tabIndex="0">
//           {JSON.stringify(sets)}
//         </td>
//       );
//     }
//   } else {
//     return (
//       <td className="spectrum-Table-cell" tabIndex="0">
//         {JSON.stringify(sets)}
//       </td>
//     );
//   }
// }

// function formatTokenValue(token) {
//   if (Object.hasOwn(token, "value")) {
//     return (
//       <td className="spectrum-Table-cell" tabIndex="0">
//         {formatTokenLink(token.value)}
//       </td>
//     );
//   } else if (Object.hasOwn(token, "sets")) {
//     return formatSets(token.sets);
//   }
// }

function TokenValue({ token }) {
  const type = token.$schema.split("/").pop().slice(0, -5);
  switch (type) {
    case "alias":
      const value = token.value.substring(1, token.value.length - 1);
      return (
        <Link className="spectrum-Link" href={`#${value}`}>
          {value}
        </Link>
      );
    case "dimension":
    case "multiplier":
    case "font-family":
    case "font-weight":
    case "font-style":
    case "font-size":
    case "text-transform":
    case "opacity":
      return <>{token.value}</>;
    case "system-set":
      if (
        Object.hasOwn(token.sets.spectrum, "sets") &&
        Object.hasOwn(token.sets, "express")
      ) {
        return (
          <>
            {Object.keys(token.sets.spectrum.sets).map((key) => (
              <div>
                <TokenValue token={token.sets.express.sets[key]}></TokenValue>{" "}
                (spectrum / {key})
              </div>
            ))}
            {Object.keys(token.sets.express.sets).map((key) => (
              <div>
                <TokenValue token={token.sets.express.sets[key]}></TokenValue>{" "}
                (express / {key})
              </div>
            ))}
          </>
        );
      }
    case "color-set":
    case "scale-set":
      return (
        <>
          {Object.keys(token.sets).map((key) => (
            <div>
              <TokenValue token={token.sets[key]}></TokenValue> ({key})
            </div>
          ))}
        </>
      );
    case "color":
      return <code>{RGBAToHexA(token.value)}</code>;
    default:
      return <code>{JSON.stringify(token)}</code>;
  }
}

function formatToken(token) {
  return (
    <tr className="spectrum-Table-row" id={token.name} key={token.name}>
      <td className="spectrum-Table-cell" tabIndex="0">
        <strong>{token.name}</strong>
      </td>
      <td className="spectrum-Table-cell" tabIndex="0">
        <TokenValue token={token}></TokenValue>
      </td>
    </tr>
  );
}

export default function TokenTable({ tokenData }) {
  return (
    <Layout>
      <Head>
        <title>Tokens</title>
      </Head>
      <table className="spectrum-Table spectrum-Table--sizeM spectrum-Table--quiet">
        <thead className="spectrum-Table-head">
          <tr>
            <th
              className="spectrum-Table-headCell"
              aria-sort="descending"
              tabIndex="0"
            >
              Token Name
            </th>
            <th className="spectrum-Table-headCell" aria-sort="none">
              Value
            </th>
          </tr>
        </thead>
        <tbody className="spectrum-Table-body">
          {tokenData.map(formatToken)}
        </tbody>
      </table>
    </Layout>
  );
}
