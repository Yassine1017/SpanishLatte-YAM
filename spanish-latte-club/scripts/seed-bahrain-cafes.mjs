import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const projectRoot = new URL("../", import.meta.url);

function parseEnv(contents) {
  return Object.fromEntries(
    contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

function parseSeeds(contents) {
  const photoUrls = [...contents.matchAll(/"(https:\/\/images\.unsplash\.com\/[^"]+)"/g)].map(
    (match) => match[1]
  );
  const rows = [
    ...contents.matchAll(/\["([^"]+)", "([^"]+)", "([^"]+)"\]/g),
  ].map((match, index) => ({
    name: match[1],
    city: "Bahrain",
    area: match[2],
    notes: match[3],
    visit_date: "2026-06-11",
    photo_url: photoUrls[index % photoUrls.length] ?? null,
  }));

  return rows;
}

const env = parseEnv(
  await readFile(new URL(".env.local", projectRoot), "utf8")
);
const seedSource = await readFile(
  new URL("src/lib/bahrain-cafes.ts", projectRoot),
  "utf8"
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const { data: authData, error: authError } =
  await supabase.auth.signInWithPassword({
    email: env.NEXT_PUBLIC_YAM_YASSINE_EMAIL ?? "yassine@yam.club",
    password: process.env.YAM_SEED_PASSWORD ?? "YAM123",
  });

if (authError) {
  throw authError;
}

const createdBy = authData.user.id;
const seeds = parseSeeds(seedSource);
const { data: existingRows, error: existingError } = await supabase
  .from("cafes")
  .select("id,name,area,notes");

if (existingError) {
  throw existingError;
}

const existingByKey = new Map(
  (existingRows ?? []).map((row) => [`${row.name}::${row.area}`, row])
);
const existingByName = new Map(
  (existingRows ?? []).map((row) => [row.name, row])
);
const existingByNotes = new Map(
  (existingRows ?? [])
    .filter((row) => row.notes)
    .map((row) => [row.notes, row])
);
const missing = [];
const updates = [];

for (const seed of seeds) {
  const key = `${seed.name}::${seed.area}`;
  const exactMatch = existingByKey.get(key);

  if (exactMatch) {
    continue;
  }

  const nameMatch = existingByName.get(seed.name) ?? existingByNotes.get(seed.notes);

  if (nameMatch) {
    updates.push({
      id: nameMatch.id,
      seed,
    });
    continue;
  }

  missing.push({
    ...seed,
    created_by: createdBy,
  });
}

for (const update of updates) {
  const { error: updateError } = await supabase
    .from("cafes")
    .update(update.seed)
    .eq("id", update.id);

  if (updateError) {
    throw updateError;
  }
}

if (missing.length) {
  const { error: insertError } = await supabase.from("cafes").insert(missing);

  if (insertError) {
    throw insertError;
  }
}

await supabase.auth.signOut();

console.log(
  JSON.stringify(
    {
      known: seeds.length,
      updated: updates.length,
      inserted: missing.length,
      alreadyThere: seeds.length - missing.length - updates.length,
    },
    null,
    2
  )
);
