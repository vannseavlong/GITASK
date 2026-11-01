import assert from "node:assert/strict"
import { test } from "node:test"
import { detectOs, installFileCommand, primaryOs, shellFor } from "../src/lib/os.ts"

const UA = {
  mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15",
  win: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36",
  linux: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36",
  android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36",
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
  ipadDesktop: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15",
  chromeos: "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 Chrome/126.0 Safari/537.36",
}

test("detects the three desktop systems", () => {
  assert.equal(detectOs(UA.mac), "mac")
  assert.equal(detectOs(UA.win), "windows")
  assert.equal(detectOs(UA.linux), "linux")
})

test("phones and iPadOS are mobile (Android is not Linux)", () => {
  assert.equal(detectOs(UA.android), "mobile")
  assert.equal(detectOs(UA.iphone), "mobile")
  assert.equal(detectOs(UA.ipadDesktop, 5), "mobile")
  assert.equal(detectOs(UA.ipadDesktop, 0), "mac")
})

test("empty, odd and ChromeOS agents are unknown", () => {
  assert.equal(detectOs(""), "unknown")
  assert.equal(detectOs("curl/8.0"), "unknown")
  assert.equal(detectOs(UA.chromeos), "unknown")
})

test("only a desktop OS gets a primary card", () => {
  assert.equal(primaryOs("mac"), "mac")
  assert.equal(primaryOs("windows"), "windows")
  assert.equal(primaryOs("linux"), "linux")
  assert.equal(primaryOs("mobile"), null)
  assert.equal(primaryOs("unknown"), null)
})

test("Windows uses PowerShell, macOS and Linux the shell form", () => {
  assert.equal(shellFor("windows"), "powershell")
  assert.equal(shellFor("mac"), "shell")
  assert.equal(shellFor("linux"), "shell")
  assert.equal(installFileCommand("windows", "a-1.vsix"), "code --install-extension .\\a-1.vsix")
  assert.equal(installFileCommand("mac", "a-1.vsix"), "code --install-extension ./a-1.vsix")
  assert.equal(installFileCommand("linux", "a-1.vsix"), "code --install-extension ./a-1.vsix")
})

test("a file name that could inject shell text gives no command", () => {
  for (const bad of ["a b.vsix", "a;rm -rf ~.vsix", "$(x).vsix", "a.zip", "a`x`.vsix", "a\n.vsix"]) {
    assert.equal(installFileCommand("linux", bad), null, bad)
  }
})

test("client hints mark Android Desktop-site mode as mobile", () => {
  assert.equal(detectOs(UA.linux, 5, true), "mobile")
  assert.equal(detectOs(UA.linux, 0, false), "linux")
  assert.equal(detectOs(UA.win, 0, undefined), "windows")
})
