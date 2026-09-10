# Security

## Reporting a vulnerability

Please report security issues privately through GitHub's
[private vulnerability reporting](https://docs.github.com/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
on this repository, rather than opening a public issue. Include the steps to
reproduce and the affected version or commit.

## What the app handles

ROAM is a static, client-only application. It has no backend, no accounts, no
analytics and no third-party requests at runtime. Saved rides and trip plans are
held in the visitor's own browser under the `localStorage` key
`roam-planner-v1`, and never leave the device except when the visitor exports a
file themselves. The profile panel offers a backup of that data and a way to
remove all of it from the browser.

## Hardening in place

- A content security policy that permits no inline or third-party scripts, no
  framing, and no cross-origin connections. It is defined once and applied by
  every host config in this repository; a test asserts the copies agree.
- `nosniff`, `DENY` framing, a restrictive `Permissions-Policy`, a same-origin
  opener policy and HSTS, set alongside the policy above.
- Stored data is re-validated and clamped on read, so a corrupted or
  hand-edited payload cannot reach the UI in an unexpected shape.
- `npm audit` for production dependencies runs on every CI build.
