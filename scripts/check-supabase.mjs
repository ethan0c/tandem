// Disposable auth/library integration check. Admin credentials stay in process memory.
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
const project = process.argv[2];
if (!/^[a-z]{20}$/.test(project || ""))
  throw new Error("Pass the Tandem test project reference.");
const keys = JSON.parse(
  execFileSync(
    "supabase",
    ["projects", "api-keys", "--project-ref", project, "--output", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ),
);
const publicKey =
  keys.find((k) => k.name === "anon")?.api_key ||
  keys.find((k) => k.type === "publishable")?.api_key;
const adminKey = keys.find((k) => k.name === "service_role")?.api_key;
if (!adminKey || !publicKey)
  throw new Error(
    "The integration check requires the project's legacy public and service keys.",
  );
const url = `https://${project}.supabase.co`;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, adminKey, options);
const users = [];
const clients = [];
const media = JSON.parse(
  readFileSync(new URL("../src/content/catalog.json", import.meta.url)),
)[0];
try {
  for (let i = 0; i < 2; i++) {
    const email = `tandem-qa-${randomUUID()}@example.com`;
    const password = randomUUID();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    assert.ifError(error);
    users.push(data.user.id);
    const client = createClient(url, publicKey, options);
    const signed = await client.auth.signInWithPassword({ email, password });
    assert.ifError(signed.error);
    clients.push(client);
  }
  const entry = {
    media,
    status: "current",
    progress: 3,
    favorite: true,
    subscribed: true,
    updatedAt: Date.now(),
  };
  const row = {
    user_id: users[0],
    media_key: `${media.kind}:${media.id}`,
    entry,
    deleted: false,
    updated_at: new Date(entry.updatedAt).toISOString(),
  };
  assert.ifError((await clients[0].from("library_entries").upsert(row)).error);
  const own = await clients[0].from("library_entries").select("entry");
  assert.ifError(own.error);
  assert.equal(own.data.length, 1);
  assert.equal(own.data[0].entry.progress, 3);
  const other = await clients[1].from("library_entries").select("entry");
  assert.ifError(other.error);
  assert.equal(other.data.length, 0);
  const forged = await clients[1]
    .from("library_entries")
    .upsert({ ...row, entry: { ...entry, progress: 999 } });
  assert.ok(forged.error);
  const anonymous = createClient(url, publicKey, options);
  const guest = await anonymous.from("library_entries").select("entry");
  assert.ok(guest.error || guest.data.length === 0);
  const stale = {
    ...row,
    entry: { ...entry, progress: 1, updatedAt: entry.updatedAt - 1000 },
    updated_at: new Date(entry.updatedAt - 1000).toISOString(),
  };
  assert.ifError(
    (await clients[0].from("library_entries").upsert(stale)).error,
  );
  const latest = await clients[0]
    .from("library_entries")
    .select("entry")
    .single();
  assert.equal(latest.data.entry.progress, 3);
  assert.ifError(
    (
      await clients[0]
        .from("library_entries")
        .upsert({
          ...row,
          deleted: true,
          updated_at: new Date(entry.updatedAt + 1000).toISOString(),
        })
    ).error,
  );
  const deleted = await clients[0]
    .from("library_entries")
    .select("deleted")
    .single();
  assert.equal(deleted.data.deleted, true);
  console.log(
    "PASS: password auth, cloud save/load, per-user isolation, anonymous denial, stale-write protection, and deletion tombstones.",
  );
} finally {
  await Promise.all(clients.map((client) => client.auth.signOut()));
  for (const id of users) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw new Error("Could not remove a disposable test account.");
  }
  console.log(
    `Removed ${users.length} disposable test accounts and their library rows.`,
  );
}
