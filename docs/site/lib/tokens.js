import path from "path";
import { readFile } from "fs/promises";
import { glob, Glob } from "glob";

const readJSON = async (filePath) =>
  JSON.parse(await readFile(filePath, "utf8"));

export async function getTokenData() {
  const tokenDir = path.resolve(
    path.join(process.cwd(), "..", "..", "packages", "tokens", "src"),
  );
  let tokenArray = [];
  const g = new Glob(`${tokenDir}/*.json`, {});
  for await (const file of g) {
    const fileTokenData = await readJSON(file);
    const newTokenArray = Object.keys(fileTokenData).map((key) => {
      return {
        name: key,
        ...fileTokenData[key],
      };
    });
    tokenArray = [...tokenArray, ...newTokenArray];
    // await fileNames.forEach(async (file) => {
    //   const fileTokenData = await readJSON(file);
    //   Object.keys(fileTokenData).forEach((key) => {
    //     tokenArray.push({
    //       name: key,
    //       token: fileTokenData[key],
    //     });
    //   });
    // });
  }
  return tokenArray;
}
