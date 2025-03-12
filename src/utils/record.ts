type KeysOfType<T, ValueType> = {
  [K in keyof T]: T[K] extends ValueType ? K : never
}[keyof T];

export default function createRecord<
  Item,
  K extends KeysOfType<Item, string | number>,
  V extends keyof Item,
>(
  collection: Item[],
  key: K,
  value: V,
) {
  return collection.reduce((bundle, item) => ({
    ...bundle,
    [item[key] as string]: item[value],
  }), {} as Record<Item[K] & (string | number), Item[V]>);
}
