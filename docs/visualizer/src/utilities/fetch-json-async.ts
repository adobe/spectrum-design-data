// const http = <T>(request: any): Promise<T> =>
//   new Promise(resolve =>
//     fetch(request)
//       .then(response => response.json())
//       .then(body => resolve(body))
//   );

// export async function fetchJsonAsync(jsonUrl: string) {
//   return http(jsonUrl);
// }

export async function fetchJsonAsync(jsonUrl: string) {
  const response = await fetch(jsonUrl);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  return data;
}

// example usage

// fetchJsonAsync('src/application-graph.json')
// .then(data => console.info(data));
