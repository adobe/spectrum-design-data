// Copyright 2026 Adobe. All rights reserved.
import type { ExpressionNode } from "./expression";

// Binding strength, so parentheses appear only where the grouping would otherwise change.
const PRECEDENCE = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2,
  negate: 3,
  "^": 4,
  atom: 5,
} as const;

/** Names are limited to letters, digits and underscores, so they cannot inject LaTeX commands. */
function variableLatex(name: string) {
  if (/^[A-Za-z]$/.test(name)) return name;
  return `\\mathrm{${name.replace(/_/g, "\\_")}}`;
}

function numberLatex(value: number) {
  if (!Number.isFinite(value)) return "0";
  return String(Math.round(value * 1e6) / 1e6);
}

function precedenceOf(node: ExpressionNode) {
  if (node.type === "binary") return PRECEDENCE[node.operator];
  if (node.type === "negate") return PRECEDENCE.negate;
  return PRECEDENCE.atom;
}

function grouped(node: ExpressionNode, minimum: number) {
  const latex = toLatex(node);
  return precedenceOf(node) < minimum ? `\\left(${latex}\\right)` : latex;
}

function callLatex(name: string, args: ExpressionNode[]): string {
  const list = args.map(toLatex);
  switch (name) {
    case "sqrt":
      return `\\sqrt{${list[0]}}`;
    case "abs":
      return `\\left|${list[0]}\\right|`;
    case "floor":
      return `\\left\\lfloor ${list[0]}\\right\\rfloor`;
    case "ceil":
      return `\\left\\lceil ${list[0]}\\right\\rceil`;
    case "pow":
      return `{${grouped(args[0], PRECEDENCE["^"] + 1)}}^{${list[1]}}`;
    case "exp":
      return `e^{${list[0]}}`;
    case "log":
      return `\\ln\\left(${list[0]}\\right)`;
    default:
      return `\\operatorname{${name}}\\left(${list.join(",\\,")}\\right)`;
  }
}

function toLatex(node: ExpressionNode): string {
  switch (node.type) {
    case "number":
      return numberLatex(node.value);
    case "variable":
      return variableLatex(node.name);
    case "negate":
      return `-${grouped(node.operand, PRECEDENCE.negate)}`;
    case "call":
      return callLatex(node.name, node.args);
    case "binary": {
      const { operator, left, right } = node;
      if (operator === "/")
        return `\\frac{${toLatex(left)}}{${toLatex(right)}}`;
      if (operator === "^")
        return `{${grouped(left, PRECEDENCE["^"] + 1)}}^{${toLatex(right)}}`;
      const level = PRECEDENCE[operator];
      const symbol = operator === "*" ? "\\cdot" : operator;
      // Subtraction is left-associative, so an equal-level right operand needs parentheses.
      return `${grouped(left, level)} ${symbol} ${grouped(right, operator === "-" || operator === "*" ? level + 1 : level)}`;
    }
  }
}

/** LaTeX for a parsed expression. The source is rebuilt from the AST, never copied from user text. */
export function expressionToLatex(node: ExpressionNode): string {
  return toLatex(node);
}
