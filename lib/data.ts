import { createClient } from "@libsql/client";
import { BreadthRow, SectoralRow } from "./types";

function getClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error("TURSO_DATABASE_URL is not set");
  return createClient({ url, authToken });
}

export async function getBreadth(): Promise<BreadthRow[]> {
  const client = getClient();
  const rs = await client.execute("SELECT * FROM breadth ORDER BY date ASC");
  return rs.rows as unknown as BreadthRow[];
}

export async function getSectoral(): Promise<SectoralRow[]> {
  const client = getClient();
  const rs = await client.execute("SELECT * FROM sectoral ORDER BY date ASC");
  return rs.rows as unknown as SectoralRow[];
}
