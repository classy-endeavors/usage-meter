export const ACCESS_COOKIE = "ce_usage";
export const ACCESS_COOKIE_VALUE = "unlocked";

export function expectedAccessCode() {
  const code = process.env.ACCESS_CODE;
  if (!code?.trim()) {
    throw new Error("Set ACCESS_CODE in the environment.");
  }
  return code.trim();
}
