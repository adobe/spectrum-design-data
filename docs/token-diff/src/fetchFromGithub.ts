import { githubAPIKey } from '../github-api-key.js';

/**
 * Fetches branch or tag options
 * @param {string} type - either branch or tag
 * @returns {Promise<any>} a JSON object containing either branches or release versions/tags
 */
export async function fetchBranchTagOptions(type: string) {
  const url =
    type === 'branch'
      ? 'https://api.github.com/repos/adobe/spectrum-tokens/branches'
      : 'https://api.github.com/repos/adobe/spectrum-tokens/releases';
  return await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `token ${githubAPIKey}`,
    },
  }).then(async response => {
    const arr: any[] | PromiseLike<any[]> = [];
    const obj = await response.json();
    Object.values(obj).forEach((value: any) => {
      if (!value.name.includes('token-diff-generator')) {
        // need to exclude releases without tokens
        arr.push(value.name);
      }
    });
    return arr;
  });
}

/**
 * Fetches list of token files for a specific branch or tag using Github API
 * @param {string} branchOrTagKey - type of desired options (branch or tag)
 * @param {string} branchOrTag - the specific branch or tag name whose token files you want to fetch
 * @returns
 */
export async function fetchSchemaOptions(
  branchOrTagKey: string,
  branchOrTag: string,
): Promise<string[]> {
  let schemaOptions: string[] = [];
  const source = 'https://raw.githubusercontent.com/adobe/spectrum-tokens/';
  let branchOrTagArr = branchOrTag.split('@');
  const url =
    branchOrTagKey !== 'branch'
      ? source +
        '%40adobe/spectrum-tokens%40' +
        branchOrTagArr[branchOrTagArr.length - 1]
      : source + branchOrTag;
  schemaOptions = await fetchTokens('manifest.json', url);
  schemaOptions.unshift('all');
  return schemaOptions;
}

/**
 * Fetchs tokens from specified token file and branch/tag
 * @param {string} tokenName - the name of the token file
 * @param {string} url - the source url + the branch or tag
 * @returns {Promise<string[]>} a JSON object containing the tokens from specified token file
 */
async function fetchTokens(tokenName: string, url: string): Promise<string[]> {
  return (await fetch(`${url}/packages/tokens/${tokenName}`)).json();
}

const source = 'https://raw.githubusercontent.com/adobe/spectrum-tokens/';

/**
 * Returns file with given file name as a JSON object (took this from diff.js)
 * @param {string} givenTokenNames - the name of the target file
 * @param {string} givenVersion - the intended package version (full name)
 * @param {string} givenBranch - the intended branch
 * @returns {object} the target file as a JSON object
 */
export async function fileImport(
  givenTokenNames: string[],
  givenVersion: string | undefined,
  givenBranch: string | undefined,
): Promise<Object> {
  const version = givenVersion || 'latest';
  const branch = givenBranch || 'main';
  const link =
    version !== 'latest'
      ? source + version.replace('@', '%40')
      : source + branch;
  let tokenNames: string[];
  if (givenTokenNames[0] === 'all') {
    tokenNames = await fetchTokens('manifest.json', link);
  } else {
    tokenNames = givenTokenNames;
  }
  const result = {};
  for (let i = 0; i < tokenNames.length; i++) {
    const tokens = await fetchTokens(tokenNames[i], link);
    Object.assign(result, tokens);
  }
  return result;
}
