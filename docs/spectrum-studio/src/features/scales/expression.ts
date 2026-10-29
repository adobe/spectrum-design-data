// Copyright 2026 Adobe. All rights reserved.
/**
 * Restricted arithmetic grammar for custom scale types and interpolations.
 * No `eval`: the source is parsed into an AST that only supports numbers, named
 * variables, + - * / ^, unary minus, and the whitelisted functions below.
 */

export type ExpressionNode =
  | { type: "number"; value: number }
  | { type: "variable"; name: string }
  | { type: "negate"; operand: ExpressionNode }
  | {
      type: "binary";
      operator: "+" | "-" | "*" | "/" | "^";
      left: ExpressionNode;
      right: ExpressionNode;
    }
  | { type: "call"; name: string; args: ExpressionNode[] };

export type ParsedExpression =
  | { ok: true; node: ExpressionNode; variables: string[] }
  | { ok: false; error: string };

export const EXPRESSION_MAX_LENGTH = 500;
// Each nesting level of parentheses costs about five recursion levels.
const MAX_DEPTH = 200;

interface FunctionDefinition {
  minArgs: number;
  maxArgs: number;
  apply: (args: number[]) => number;
}

export const EXPRESSION_FUNCTIONS: Readonly<
  Record<string, FunctionDefinition>
> = {
  pow: {
    minArgs: 2,
    maxArgs: 2,
    apply: ([base, exponent]) => Math.pow(base, exponent),
  },
  min: { minArgs: 1, maxArgs: Infinity, apply: (args) => Math.min(...args) },
  max: { minArgs: 1, maxArgs: Infinity, apply: (args) => Math.max(...args) },
  abs: { minArgs: 1, maxArgs: 1, apply: ([value]) => Math.abs(value) },
  round: { minArgs: 1, maxArgs: 1, apply: ([value]) => Math.round(value) },
  floor: { minArgs: 1, maxArgs: 1, apply: ([value]) => Math.floor(value) },
  ceil: { minArgs: 1, maxArgs: 1, apply: ([value]) => Math.ceil(value) },
  clamp: {
    minArgs: 3,
    maxArgs: 3,
    apply: ([value, low, high]) => Math.min(high, Math.max(low, value)),
  },
  sqrt: { minArgs: 1, maxArgs: 1, apply: ([value]) => Math.sqrt(value) },
  log: { minArgs: 1, maxArgs: 1, apply: ([value]) => Math.log(value) },
  exp: { minArgs: 1, maxArgs: 1, apply: ([value]) => Math.exp(value) },
};

/** Names parameters and variables may not use. */
export function isReservedExpressionName(name: string) {
  return Object.prototype.hasOwnProperty.call(EXPRESSION_FUNCTIONS, name);
}

export function isExpressionIdentifier(name: string) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

type Token =
  | { type: "number"; value: number }
  | { type: "identifier"; value: string }
  | { type: "symbol"; value: "+" | "-" | "*" | "/" | "^" | "(" | ")" | "," };

class ParseError extends Error {}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let position = 0;
  while (position < source.length) {
    const char = source[position];
    if (/\s/.test(char)) {
      position++;
      continue;
    }
    const number = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(
      source.slice(position),
    );
    if (number) {
      tokens.push({ type: "number", value: Number(number[0]) });
      position += number[0].length;
      continue;
    }
    const identifier = /^[A-Za-z_][A-Za-z0-9_]*/.exec(source.slice(position));
    if (identifier) {
      tokens.push({ type: "identifier", value: identifier[0] });
      position += identifier[0].length;
      continue;
    }
    if ("+-*/^(),".includes(char)) {
      tokens.push({
        type: "symbol",
        value: char as Extract<Token, { type: "symbol" }>["value"],
      });
      position++;
      continue;
    }
    throw new ParseError(`Unexpected "${char}".`);
  }
  return tokens;
}

class Parser {
  private position = 0;
  readonly variables = new Set<string>();

  constructor(private readonly tokens: Token[]) {}

  parse(): ExpressionNode {
    const node = this.parseSum(0);
    if (this.position < this.tokens.length)
      throw new ParseError("Unexpected input after the expression.");
    return node;
  }

  private peekSymbol(...symbols: string[]) {
    const token = this.tokens[this.position];
    return token?.type === "symbol" && symbols.includes(token.value)
      ? token.value
      : null;
  }

  private expectSymbol(symbol: string) {
    if (this.peekSymbol(symbol) === null)
      throw new ParseError(`Expected "${symbol}".`);
    this.position++;
  }

  private parseSum(depth: number): ExpressionNode {
    this.guard(depth);
    let left = this.parseProduct(depth + 1);
    for (
      let operator = this.peekSymbol("+", "-");
      operator;
      operator = this.peekSymbol("+", "-")
    ) {
      this.position++;
      left = {
        type: "binary",
        operator: operator as "+" | "-",
        left,
        right: this.parseProduct(depth + 1),
      };
    }
    return left;
  }

  private parseProduct(depth: number): ExpressionNode {
    let left = this.parseUnary(depth + 1);
    for (
      let operator = this.peekSymbol("*", "/");
      operator;
      operator = this.peekSymbol("*", "/")
    ) {
      this.position++;
      left = {
        type: "binary",
        operator: operator as "*" | "/",
        left,
        right: this.parseUnary(depth + 1),
      };
    }
    return left;
  }

  // Unary minus binds looser than ^ so that -2^2 is -4.
  private parseUnary(depth: number): ExpressionNode {
    this.guard(depth);
    if (this.peekSymbol("-")) {
      this.position++;
      return { type: "negate", operand: this.parseUnary(depth + 1) };
    }
    if (this.peekSymbol("+")) {
      this.position++;
      return this.parseUnary(depth + 1);
    }
    return this.parsePower(depth + 1);
  }

  private parsePower(depth: number): ExpressionNode {
    const left = this.parsePrimary(depth + 1);
    if (!this.peekSymbol("^")) return left;
    this.position++;
    return {
      type: "binary",
      operator: "^",
      left,
      right: this.parseUnary(depth + 1),
    };
  }

  private parsePrimary(depth: number): ExpressionNode {
    this.guard(depth);
    const token = this.tokens[this.position];
    if (!token) throw new ParseError("The expression ends too soon.");
    this.position++;
    if (token.type === "number") return { type: "number", value: token.value };
    if (token.type === "symbol") {
      if (token.value !== "(")
        throw new ParseError(`Unexpected "${token.value}".`);
      const inner = this.parseSum(depth + 1);
      this.expectSymbol(")");
      return inner;
    }
    if (this.peekSymbol("(")) {
      this.position++;
      return this.parseCall(token.value, depth);
    }
    this.variables.add(token.value);
    return { type: "variable", name: token.value };
  }

  private parseCall(name: string, depth: number): ExpressionNode {
    const definition = Object.prototype.hasOwnProperty.call(
      EXPRESSION_FUNCTIONS,
      name,
    )
      ? EXPRESSION_FUNCTIONS[name]
      : undefined;
    if (!definition) throw new ParseError(`Unknown function "${name}".`);
    const args: ExpressionNode[] = [];
    if (!this.peekSymbol(")")) {
      args.push(this.parseSum(depth + 1));
      while (this.peekSymbol(",")) {
        this.position++;
        args.push(this.parseSum(depth + 1));
      }
    }
    this.expectSymbol(")");
    if (args.length < definition.minArgs || args.length > definition.maxArgs) {
      const expected =
        definition.maxArgs === Infinity
          ? `at least ${definition.minArgs}`
          : String(definition.minArgs);
      throw new ParseError(`"${name}" takes ${expected} argument(s).`);
    }
    return { type: "call", name, args };
  }

  private guard(depth: number) {
    if (depth > MAX_DEPTH)
      throw new ParseError("The expression is nested too deeply.");
  }
}

/**
 * Parses and validates against the names the caller provides; variables outside `allowedVariables` are errors.
 */
export function parseExpression(
  source: string,
  allowedVariables: readonly string[],
): ParsedExpression {
  if (!source.trim()) return { ok: false, error: "Enter an expression." };
  if (source.length > EXPRESSION_MAX_LENGTH)
    return {
      ok: false,
      error: `Use at most ${EXPRESSION_MAX_LENGTH} characters.`,
    };
  try {
    const parser = new Parser(tokenize(source));
    const node = parser.parse();
    const unknown = [...parser.variables].filter(
      (name) => !allowedVariables.includes(name),
    );
    if (unknown.length > 0)
      return { ok: false, error: `Unknown name "${unknown[0]}".` };
    return { ok: true, node, variables: [...parser.variables] };
  } catch (error) {
    if (error instanceof ParseError) return { ok: false, error: error.message };
    throw error;
  }
}

const parseCache = new Map<string, ParsedExpression>();

/** Generation re-parses the same source for every value; this keeps that to one parse. */
export function parseExpressionCached(
  source: string,
  allowedVariables: readonly string[],
): ParsedExpression {
  const key = `${allowedVariables.join(",")}|${source}`;
  let parsed = parseCache.get(key);
  if (!parsed) {
    parsed = parseExpression(source, allowedVariables);
    if (parseCache.size > 200) parseCache.clear();
    parseCache.set(key, parsed);
  }
  return parsed;
}

export function evaluateExpression(
  node: ExpressionNode,
  variables: Readonly<Record<string, number>>,
): number {
  switch (node.type) {
    case "number":
      return node.value;
    case "variable":
      return variables[node.name] ?? NaN;
    case "negate":
      return -evaluateExpression(node.operand, variables);
    case "binary":
      return applyOperator(
        node.operator,
        evaluateExpression(node.left, variables),
        evaluateExpression(node.right, variables),
      );
    case "call":
      return EXPRESSION_FUNCTIONS[node.name].apply(
        node.args.map((arg) => evaluateExpression(arg, variables)),
      );
  }
}

function applyOperator(
  operator: "+" | "-" | "*" | "/" | "^",
  left: number,
  right: number,
) {
  switch (operator) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      return left / right;
    case "^":
      return Math.pow(left, right);
  }
}
