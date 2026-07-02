import { createClient } from "@libsql/client";
import { BreadthRow, SectoralRow, AiInsight } from "./types";

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

// Rolling window of AI Expert Insights (at most the last 8 days). Returns [] if the
// table doesn't exist yet (e.g. before the first insight has been generated/pushed),
// so the rest of the site keeps working.
export async function getAiInsights(): Promise<AiInsight[]> {
  const client = getClient();
  try {
    const rs = await client.execute(
      "SELECT date, insight, model, generated_at FROM ai_insight ORDER BY date DESC LIMIT 8"
    );
    return rs.rows as unknown as AiInsight[];
  } catch {
    return [];
  }
}
