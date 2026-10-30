import { test } from "node:test";
import assert from "node:assert/strict";
import { applySync, isRepoSlug, parseGithubConfig } from "../src/index.ts";

const cfg = (repo: string) => parseGithubConfig(JSON.stringify({ github: { repo } }));

test("repo slug: dot segments, .git suffix, extra segments and bad owners are rejected", () => {
  for (const bad of ["../x", "acme/..", "acme/.", "./app", "../..", "acme/app.git", "acme/app/extra", "-acme/app", "a_b/app", "a".repeat(40) + "/app", "acme/" + "n".repeat(101), "acme/a b", "acme%2f/app", "/app", "acme/"]) {
    assert.equal(cfg(bad), undefined, bad);
    assert.equal(isRepoSlug(bad), false, bad);
  }
  for (const ok of ["acme/app", "Acme-1/my_repo.js", "a/.github", "acme/app..x", "a".repeat(39) + "/" + "n".repeat(100)]) assert.deepEqual(cfg(ok), { repo: ok }, ok);
});

test("request URLs are built under /repos/<owner>/<name> for any accepted repo", async () => {
  const urls: string[] = [];
  const fetch = (async (u: string) => { urls.push(String(u)); return new Response("{}", { status: 200 }); }) as unknown as typeof globalThis.fetch;
  await applySync({ repo: cfg("Acme-1/.github")!.repo, issues: [{ taskId: "t", path: "/x", title: "T", body: "", state: "open", assignees: [], action: "update", issue: 5, subIssues: [] }], notify: [], warnings: [] }, "tok", { fetch, baseUrl: "https://api.example.test" }).catch(() => undefined);
  assert.ok(urls.length && urls.every((u) => u.startsWith("https://api.example.test/repos/Acme-1/.github/issues/")), urls.join());
  assert.ok(urls.every((u) => new URL(u).pathname === u.replace("https://api.example.test", "")), "no path normalisation");
});
