import { describe, expect, it } from "vitest";
import { findMentionedAgentIds } from "../services/issues.js";

describe("findMentionedAgentIds", () => {
  const agents = [
    { id: "ops", name: "Operations Director" },
    { id: "fe", name: "Founding Engineer" },
    { id: "ceo", name: "CEO" },
  ];

  it("matches multi-word agent names exactly", () => {
    expect(findMentionedAgentIds("@Operations Director please resume CLA-34.", agents)).toEqual(["ops"]);
  });

  it("matches case-insensitively and supports punctuation boundaries", () => {
    expect(findMentionedAgentIds("Need a hand from @founding engineer, please check.", agents)).toEqual(["fe"]);
  });

  it("does not partial-match only the first word of a multi-word name", () => {
    expect(findMentionedAgentIds("@Operations please take a look.", agents)).toEqual([]);
  });

  it("keeps single-word mentions working", () => {
    expect(findMentionedAgentIds("@CEO please review.", agents)).toEqual(["ceo"]);
  });
});
