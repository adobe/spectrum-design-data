export default class SaveOptionEvent extends CustomEvent<ComponentOptionInterface> {
  option: ComponentOptionInterface;
  static type: string = "saveOption";

  constructor(option: ComponentOptionInterface) {
    super(SaveOptionEvent.type, {
      detail: option,
      bubbles: true,
      composed: true,
    });
    this.option = option;
  }
}
