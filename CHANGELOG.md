# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-01-15

### Added

- Crawler option (`--crawler`, `-c`) to choose between `fetch` (default) and `chrome` crawlers for fetching URL content
- Support for `CRAWLER` environment variable to set the default crawler
- Chrome crawler using Puppeteer to fetch content from JavaScript-heavy and dynamically rendered pages
- Crawler option support in preset files

## [2.0.0] - 2026-01-13

### Added

- Variable replacement support via `--var` option to replace placeholders in prompts using `{{variable}}` syntax
- Support for multiple variables in a single prompt
- Variable replacement works with both regular prompts and stdin input
- Support for preset files to define reusable configurations with prompts, models, format, schema, files, and URLs

### Changed

- CLI now requires explicit commands - use `heyi prompt "text"` instead of `heyi "text"` and `heyi preset file.json` for preset files

## [1.1.0] - 2025-12-20

### Added

- Support for handling multiple files via the `--file` option in the CLI

## [1.0.0] - 2025-12-18

### Added

- Initial release
