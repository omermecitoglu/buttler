/* export function range(min: number, max: number) {
  return Array(1 + max - min).fill(null).map((_, index) => (min + index).toString());
} */

function kebabToCamel(kebab: string): string {
  return kebab.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
}

function fixKey(key: string) {
  return kebabToCamel(key.replace(/\[\]$/, ""));
}

export function getData(formData: FormData) {
  return Array.from(formData.keys()).reduce((bundle, key) => ({
    ...bundle,
    [fixKey(key)]: key.endsWith("[]") ? formData.getAll(key) : formData.get(key),
  }), {} as Record<string, unknown>);
}
