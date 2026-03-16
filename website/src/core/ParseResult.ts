/**
 * Describes the result of a parse process.
 */
export type ParseResult = {
  ast: unknown;
  error: Error | null;
  time: number | null;
  treeAdapter: {
    type: string;
    options: Record<string, unknown>;
  } | null;
};
