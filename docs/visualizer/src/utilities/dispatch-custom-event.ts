export function dispatchCustomEvent(
  scope: Element,
  event: string,
  args: any = {},
) {
  scope.dispatchEvent(
    new CustomEvent(event, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: args,
    }),
  );
}
