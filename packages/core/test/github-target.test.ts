import { test } from "node:test";
import assert from "node:assert/strict";
import { applySync, GithubError, parseGithubRemote, planSync } from "../src/index.ts";
import type { Board } from "../src/index.ts";

const board: Board = { dir: "/r/Tasks", columns: [{ id: "2-todo", label: "todo", tasks: [] }] };

test("parseGithubRemote: https, ssh and scp forms; other hosts and junk are undefined", () => {
  for (const [url, want] of [
    ["https://github.com/acme/app.git", "acme/app"],
    ["https://github.com/acme/app", "acme/app"],
    ["https://user:tok@github.com/acme/app.git/", "acme/app"],
    ["git@github.com:acme/app.git", "acme/app"],
    ["ssh://git@github.com/acme/app.git", "acme/app"],
    ["https://gitlab.com/acme/app.git", undefined],
    ["https://github.com.evil.io/acme/app", undefined],
    ["https://github.com/../app", undefined],
    ["https://github.com/acme", undefined],
    ["", undefined],
  ] as const) assert.equal(parseGithubRemote(url), want, url);
});

test("planSync: repoMismatch when origin differs or is missing; none when it matches (case-insensitive) or is not checked", () => {
  const p = (origin?: string | null) => planSync(board, { repo: "acme/app" }, [], origin === undefined ? {} : { origin });
  assert.equal(p().repoMismatch, undefined);
  assert.equal(p("Acme/App").repoMismatch, undefined);
  assert.equal(p("attacker/public").repoMismatch?.origin, "attacker/public");
  assert.equal(p(null).repoMismatch?.origin, null);
  assert.match(p(null).repoMismatch!.message, /no GitHub origin/);
});

test("planSync hash: stable for the same input, different when the plan or the repo changes", () => {
  const a = planSync(board, { repo: "acme/app" }, []);
  assert.match(a.hash, /^[0-9a-f]{64}$/);
  assert.equal(planSync(board, { repo: "acme/app" }, []).hash, a.hash);
  assert.notEqual(planSync(board, { repo: "acme/other" }, []).hash, a.hash);
  assert.notEqual(planSync(board, { repo: "acme/app" }, [], { origin: null }).hash, a.hash);
});

test("applySync refuses a mismatched plan unless allowRepo names the plan's repo; nothing is fetched", async () => {
  let calls = 0;
  const fetch = (async () => { calls++; return new Response("{}", { status: 200 }); }) as unknown as typeof globalThis.fetch;
  const plan = planSync(board, { repo: "attacker/public" }, [], { origin: "acme/app" });
  await assert.rejects(applySync(plan, "tok", { fetch }), (e: unknown) => e instanceof GithubError && /attacker\/public/.test(e.message));
  await assert.rejects(applySync(plan, "tok", { fetch, allowRepo: "acme/app" }), GithubError);
  assert.equal(calls, 0);
  await applySync(plan, "tok", { fetch, allowRepo: "attacker/public" }); // no issues in the plan: succeeds without requests
});
