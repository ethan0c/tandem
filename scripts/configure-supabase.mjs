// Reads credentials directly from the CLI; only the browser-safe key is written.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const project = process.argv[2];
if (!/^[a-z]{20}$/.test(project || "")) throw new Error("Pass the Supabase project reference.");
const keys = JSON.parse(execFileSync("supabase", ["projects", "api-keys", "--project-ref", project, "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
const publicKey = keys.find(k => k.type === "publishable")?.api_key || keys.find(k => k.name === "anon")?.api_key;
if (!publicKey) throw new Error("The project has no public client key.");
let env = existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "";
for (const [key, value] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: `https://${project}.supabase.co`, NEXT_PUBLIC_SUPABASE_ANON_KEY: publicKey })) {
  const pattern = new RegExp(`^${key}=.*$`, "m");
  env = pattern.test(env) ? env.replace(pattern, `${key}=${value}`) : `${env.trimEnd()}\n${key}=${value}\n`;
}
writeFileSync(".env.local", env.trimStart(), { mode: 0o600 });
console.log("Configured the Supabase URL and public client key in ignored .env.local.");
