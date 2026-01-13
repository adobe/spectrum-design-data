export default class SaveOptionEvent extends CustomEvent {
  constructor(option) {
    super(SaveOptionEvent.type, {
      detail: option,
      bubbles: true,
      composed: true,
    });
    this.option = option;
  }
}
SaveOptionEvent.type = "saveOption";
//# sourceMappingURL=saveOptionEvent.js.map
