// Copyright 2026 Adobe. All rights reserved.
import { tokenUuid } from "../../tokens/model";

export const dataVisSourceId = (id: string) => `data-vis:${id}`;
export const dataVisMemberId = (scaleId: string, memberId: string) =>
  tokenUuid(`data-vis-member:v1:${JSON.stringify([scaleId, memberId])}`);
