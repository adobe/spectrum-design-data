// Copyright 2026 Adobe. All rights reserved.
import "./TokenNameTag.css";

export function TokenNameTag({ name }: { name: string }) {
  return (
    <span className="tokenNameTag" title={name}>
      {name}
    </span>
  );
}
