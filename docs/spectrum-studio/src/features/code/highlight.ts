// Copyright 2026 Adobe. All rights reserved.
import Prism from "prismjs";
import "prismjs/components/prism-css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-json";
import { highlightedChunks, type CodeLanguage } from "./chunks";

export interface HighlightRequest {
  code: string;
  language: CodeLanguage;
}

function encodeSource(value: string | Prism.Token): string | Prism.Token;
function encodeSource(value: Prism.TokenStream): Prism.TokenStream;
function encodeSource(value: Prism.TokenStream): Prism.TokenStream {
  if (typeof value === "string")
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/\r/g, "&#13;");
  if (Array.isArray(value)) return value.map((token) => encodeSource(token));
  const token = new Prism.Token(
    value.type,
    encodeSource(value.content),
    value.alias,
  );
  token.length = value.length;
  token.greedy = value.greedy;
  return token;
}

export function highlightCode({ code, language }: HighlightRequest): string[] {
  const grammar = Prism.languages[language];
  if (!grammar)
    throw new Error(`Syntax coloring is unavailable for ${language}.`);
  const environment: {
    code: string;
    grammar: Prism.Grammar;
    language: string;
    tokens?: Prism.TokenStream;
  } = { code, grammar, language };
  Prism.hooks.run("before-tokenize", environment);
  environment.tokens = Prism.tokenize(environment.code, environment.grammar);
  Prism.hooks.run("after-tokenize", environment);
  // Prism's default encoder replaces non-breaking spaces; HTML also normalizes raw CRLF.
  return highlightedChunks(
    Prism.Token.stringify(
      encodeSource(environment.tokens),
      environment.language,
    ),
  );
}
