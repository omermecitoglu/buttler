import { isIPv4 } from "node:net";

type AddressRange = {
  first: number,
  last: number,
};

function parseSubnet(subnet: string): AddressRange | null {
  const [address, prefix] = subnet.split("/");
  if (!isIPv4(address)) return null;
  const size = 2 ** (32 - Number(prefix));
  const value = address.split(".").reduce((result, octet) => (result * 256) + Number(octet), 0);
  // The given address may be any address of the subnet
  const first = value - (value % size);
  return { first, last: first + size - 1 };
}

function formatAddress(value: number) {
  return [24, 16, 8, 0].map(shift => Math.floor(value / (2 ** shift)) % 256).join(".");
}

/** Returns the first subnet of the pool that doesn't overlap the used ones, or null if there is none. IPv6 is ignored. */
export function findFreeSubnet(pool: string, prefix: number, usedSubnets: string[]): string | null {
  const range = parseSubnet(pool);
  if (!range) return null;
  const usedRanges = usedSubnets.map(parseSubnet).filter(used => used !== null);
  const size = 2 ** (32 - prefix);
  for (let first = range.first; first + size - 1 <= range.last; first += size) {
    const last = first + size - 1;
    if (!usedRanges.some(used => used.first <= last && used.last >= first)) {
      return `${formatAddress(first)}/${prefix}`;
    }
  }
  return null;
}
