export const ACCESS_COOKIE = "ce_usage";
export const ACCESS_COOKIE_VALUE = "unlocked";

export function expectedAccessCode() {
  return process.env.ACCESS_CODE || "1998";
}
