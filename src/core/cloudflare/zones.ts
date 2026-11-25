import "server-only";
import { cloudflareFetch } from "./client";

export type CloudflareZone = {
  id: string,
  name: string,
  accountId: string,
  accountName: string,
};

type ZoneApiResponse = {
  id: string,
  name: string,
  account: { id: string, name: string },
};

const PAGE_SIZE = 50;

/** Returns the zones of the accounts that were chosen while connecting */
export async function getZones(): Promise<CloudflareZone[]> {
  const zones: CloudflareZone[] = [];
  let totalPages = 1;
  for (let page = 1; page <= totalPages; page++) {
    const query = new URLSearchParams({ page: `${page}`, per_page: `${PAGE_SIZE}`, order: "name" });
    const { result, result_info: info } = await cloudflareFetch<ZoneApiResponse[]>(`/zones?${query}`);
    zones.push(...result.map(({ id, name, account }) => ({
      id,
      name,
      accountId: account.id,
      accountName: account.name,
    })));
    totalPages = info?.total_pages ?? 1;
  }
  return zones;
}
