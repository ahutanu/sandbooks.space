# Security Policy

## Supported Versions

Sandbooks is currently pre-1.0. The `main` branch is the only supported release line and receives security updates regularly. If you are running a fork or custom deployment, please keep it up to date with `main`.

## Reporting a Vulnerability

Please email security reports to [alex@hutanu.net](mailto:alex@hutanu.net) instead of opening a public issue. Include as much detail as possible:

- A clear description of the vulnerability and potential impact
- Steps to reproduce
- Any logs, payloads, or proof-of-concept code
- Recommended remediation if you have one

We aim to acknowledge reports within 48 hours and provide a remediation plan or fix within 5 business days. Coordinated disclosure is appreciated; we will credit reporters in release notes unless you prefer otherwise.

## Scope

- Sandbooks frontend (`src/`)
- Sandbooks backend API (`backend/`)
- Deployment and CI/CD workflows (`.github/workflows/`, `deploy.sh`)

Reports about third-party services (e.g., Hopx) are out of scope unless they demonstrate an exploit in Sandbooks. Please avoid testing with production user data.
