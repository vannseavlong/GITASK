/**
 * Fill `{name}` placeholders in one pass. Values are inserted literally (no `$&`/`$1` expansion,
 * as `String.replace` with a string would do) and a value that contains `{other}` is not expanded again.
 */
export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (Object.hasOwn(vars, k) ? vars[k] : m));
}
