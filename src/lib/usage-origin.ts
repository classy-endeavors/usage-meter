export function usageOrigin() {
  const origin =
    process.env.NEXT_PUBLIC_USAGE_ORIGIN ?? process.env.USAGE_ORIGIN;
  if (!origin?.trim()) {
    throw new Error(
      "Set NEXT_PUBLIC_USAGE_ORIGIN (or USAGE_ORIGIN) in the environment.",
    );
  }
  return origin.trim().replace(/\/+$/, "");
}
