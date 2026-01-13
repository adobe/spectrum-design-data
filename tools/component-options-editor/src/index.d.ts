interface ComponentOptionInterface {
  title: string;
  type: OptionTypes;
  items?: Array<string>;
  description?: string;
  defaultValue?: string | boolean | number;
  required?: boolean;
}
interface StringOptionInterface extends ComponentOptionInterface {
  type: "string";
  defaultValue?: string;
}
interface BooleanOptionInterface extends ComponentOptionInterface {
  type: "boolean";
  defaultValue: false;
}
interface LocalEnumOptionInterface extends ComponentOptionInterface {
  type: "localEnum";
  defaultValue: string;
  items: Array<string>;
}
interface SystemEnumOptionInterface extends ComponentOptionInterface {
  type: "systemEnum";
  defaultValue: string;
  items: Array<string>;
}
interface SizeOptionInterface extends ComponentOptionInterface {
  type: "size";
  defaultValue: string;
  items: Array<"xs" | "s" | "m" | "l" | "xl" | "xxl" | "xxxl">;
}
interface StateOptionInterface extends ComponentOptionInterface {
  type: "state";
  defaultValue: string;
  items: Array<string>;
}
interface IconOptionInterface extends ComponentOptionInterface {
  type: "icon";
  defaultValue?: string;
}
interface ColorOptionInterface extends ComponentOptionInterface {
  type: "color";
  defaultValue?: string;
}
interface MetaInterface {
  category: string;
  documentationUrl: string;
}
interface ComponentInterface {
  title: string;
  meta: MetaInterface;
  options: Array<ComponentOptionInterface>;
}

/**
 * A system option represents a reusable global enum list
 * that can be referenced when creating component options with type 'systemEnum'.
 */
interface SystemOptionInterface {
  id: string;
  title: string;
  description?: string;
  items: Array<string>;
}

/**
 * Container for all system options stored in the plugin.
 */
interface SystemOptionsData {
  systemOptions: Array<SystemOptionInterface>;
}

/**
 * Default system options pre-populated from Spectrum component schemas.
 */
declare const DEFAULT_SYSTEM_OPTIONS: Array<SystemOptionInterface>;

type OptionTypes =
  | "string"
  | "boolean"
  | "localEnum"
  | "systemEnum"
  | "size"
  | "state"
  | "icon"
  | "color"
  | "dimension";
