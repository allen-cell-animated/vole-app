# Contributing to open source projects by the Allen Institute

Thank you for your interest in contributing to this open source project by the
cell science accelerator at the Allen Institute! This document is a set of
guidelines to help you contribute to this project.

## Code of Conduct

By participating in this project, you are expected to uphold our [Code of
Conduct][code_of_conduct].

[code_of_conduct]: CODE_OF_CONDUCT.md

## Project Documentation

The `README` in the root of the repository should contain or link to
project documentation. If you cannot find the documentation you're
looking for, please file a GitHub issue with details of what
you'd like to see documented.

## How to Contribute

1. Fork the repo on GitHub.
2. Create a branch and make your edits on your branch, pushing back to your fork.
3. Make sure `npm run typeCheck`, `npm run test` and `npm run lint` all exit without errors. Add tests and documentation as needed.
4. Submit a pull request back to main via GitHub using template, include screen shots for visual changes.

---

## Publishing

1. Make a new version: `npm version [patch/minor/major]` -- this will give you the new tag, e.g., `v2.7.1`
2. Push the new package.json version: `git push origin main`
3. Push the new tag: `git push origin [NEW_TAG]` -- e.g. `git push origin v2.7.1`

## Questions or Thoughts?

Talk to us on [one of our community forums][community].

[community]: https://forum.allencell.org/
