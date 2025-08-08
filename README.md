# Smart Reviewer Assignment

A GitHub Action that intelligently assigns reviewers to pull requests with balanced workload distribution, smart contributor analysis, and configurable selection modes.

## Features

- 🎲 **Random Reviewer Selection**: Randomly selects reviewers from a specified list
- 🔄 **Balanced Selection**: Intelligently selects reviewers based on past participation history
- 👥 **Always Add List**: Ensures specific users are always added as reviewers
- 📊 **Code Contributor Analysis**: Optionally adds the top contributor of modified files as a reviewer
- ⚙️ **Configurable Minimum**: Set minimum number of reviewers to assign
- 🔄 **Smart Assignment**: Avoids duplicate assignments and respects existing reviewers
- 📈 **Participation Tracking**: Tracks reviewer participation through comments and reviews

## Usage

### Basic Example

```yaml
name: Auto Assign Reviewers
on:
  pull_request:
    types: [opened]

jobs:
  assign-reviewers:
    runs-on: ubuntu-latest
    steps:
      - name: Assign Random Reviewers
        uses: qixiang/smart-reviewer-assignment@v0.1
        with:
          reviewer-list: 'alice,bob,charlie,diana'
          min-reviewers: 2
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Balanced Selection Example

```yaml
name: Auto Assign Reviewers
on:
  pull_request:
    types: [opened]

jobs:
  assign-reviewers:
    runs-on: ubuntu-latest
    steps:
      - name: Assign Balanced Reviewers
        uses: qixiang/smart-reviewer-assignment@v0.1
        with:
          reviewer-list: 'alice,bob,charlie,diana,eve,frank'
          always-add: 'alice'
          min-reviewers: 3
          selection-mode: 'balanced'
          balanced-lookback: 15
          participation-checks: 'reviewers,comments'
          add-top-contributor: true
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Advanced Random Selection Example

```yaml
name: Auto Assign Reviewers
on:
  pull_request:
    types: [opened]

jobs:
  assign-reviewers:
    runs-on: ubuntu-latest
    steps:
      - name: Assign Random Reviewers
        uses: qixiang/smart-reviewer-assignment@v0.1.0
        with:
          reviewer-list: 'alice,bob,charlie,diana,eve,frank'
          always-add: 'alice,bob'
          min-reviewers: 3
          selection-mode: 'random'
          add-top-contributor: true
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `reviewer-list` | Comma-separated list of GitHub usernames to select reviewers from | Yes | - |
| `always-add` | Comma-separated list of GitHub usernames that should always be added as reviewers | No | `''` |
| `min-reviewers` | Minimum number of reviewers to assign | No | `2` |
| `selection-mode` | Reviewer selection mode: `random` or `balanced` | No | `random` |
| `balanced-lookback` | Number of recent PRs to analyze for balanced selection | No | `10` |
| `participation-checks` | What to check for participation: `reviewers`, `comments`, or `reviewers,comments` | No | `reviewers,comments` |
| `add-top-contributor` | Whether to add the top code contributor of modified files as a reviewer | No | `true` |
| `github-token` | GitHub token with pull request write permissions | No | `${{ github.token }}` |

## Outputs

| Output | Description |
|--------|-------------|
| `reviewers-added` | Comma-separated list of reviewers that were added |
| `code-contributor` | Username of the code contributor that was added (if any) |
| `selection-method` | The selection method used (e.g., "random", "balanced (lookback: 10, checks: reviewers,comments)") |

## How It Works

### Random Mode (Default)
1. **Current Reviewers Check**: Identifies existing reviewers to avoid duplicates
2. **Always Add**: Adds users from the `always-add` list (if not already assigned)
3. **Random Selection**: Randomly selects additional reviewers to meet `min-reviewers` requirement
4. **Top Contributor Analysis**: If enabled, analyzes modified files to find the top contributor and adds them as a reviewer
5. **Assignment**: Adds all selected reviewers to the pull request

### Balanced Mode
1. **Current Reviewers Check**: Identifies existing reviewers to avoid duplicates  
2. **Always Add**: Adds users from the `always-add` list (if not already assigned)
3. **PR History Analysis**: Analyzes the last X pull requests (configurable) to track participation
4. **Participation Scoring**: Calculates participation scores based on:
   - **Reviewers**: Users who provided reviews on past PRs
   - **Comments**: Users who commented on past PRs  
   - **Reviewers,Comments**: Combined review and comment activity (default)
5. **Balanced Selection**: Selects reviewers with lowest participation scores first
6. **Top Contributor Analysis**: If enabled, adds the top contributor as additional reviewer
7. **Assignment**: Adds all selected reviewers to the pull request

The balanced algorithm ensures fair distribution of review workload by prioritizing team members who have participated less in recent PRs.

## Permissions

The action requires the following permissions:

```yaml
permissions:
  pull-requests: write
  contents: read
```

## Development

### Prerequisites

- Node.js 20+
- npm or yarn

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd smart-reviewer-assignment

# Install dependencies
npm install

# Build the action
npm run build

# Run linting
npm run lint

# Format code
npm run format
```

### Building

The action uses `@vercel/ncc` to compile TypeScript and dependencies into a single JavaScript file:

```bash
npm run build
```

This creates the `dist/index.js` file that GitHub Actions will execute.

### Testing

```bash
npm test
```

## Release Process

1. **Update Version**: Update the version in `package.json`
2. **Build**: Run `npm run build` to create the distribution files
3. **Commit**: Commit all changes including the `dist/` directory
4. **Tag**: Create a git tag with the version (e.g., `v1.0.0`)
5. **Release**: Create a GitHub release pointing to the tag

```bash
# Example release process
npm run build
git add .
git commit -m "Release v1.0.0"
git tag v1.0.0
git push origin main --tags
```

## Installation in Other Repositories

### Option 1: Use in Workflow (Recommended)

Add to your repository's `.github/workflows/assign-reviewers.yml`:

```yaml
name: Auto Assign Reviewers
on:
  pull_request:
    types: [opened]

jobs:
  assign-reviewers:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      contents: read
    steps:
      - name: Assign Random Reviewers
        uses: qixiang/smart-reviewer-assignment@0.1
        with:
          reviewer-list: 'user1,user2,user3'
          min-reviewers: 2
```

### Option 2: Marketplace Publication

To publish to GitHub Marketplace:

1. Ensure your repository is public
2. Add proper metadata to `action.yml`
3. Create a release with a tag
4. Follow GitHub's marketplace publication process

## Configuration Examples

### Small Team Setup (Random)
```yaml
with:
  reviewer-list: 'alice,bob,charlie'
  always-add: 'alice'
  min-reviewers: 2
  selection-mode: 'random'
```

### Small Team Setup (Balanced)
```yaml
with:
  reviewer-list: 'alice,bob,charlie'
  always-add: 'alice'
  min-reviewers: 2
  selection-mode: 'balanced'
  balanced-lookback: 5
  participation-checks: 'reviewers,comments'
```

### Large Team with Fair Distribution
```yaml
with:
  reviewer-list: 'dev1,dev2,dev3,dev4,dev5,dev6'
  always-add: 'tech-lead'
  min-reviewers: 3
  selection-mode: 'balanced'
  balanced-lookback: 20
  participation-checks: 'reviewers'
  add-top-contributor: true
```

### Comment-Focused Balanced
```yaml
with:
  reviewer-list: 'alice,bob,charlie,diana,eve'
  min-reviewers: 2
  selection-mode: 'balanced'
  balanced-lookback: 15
  participation-checks: 'comments'
```

### Security-First Approach
```yaml
with:
  reviewer-list: 'security-team,dev-lead,senior-dev1,senior-dev2'
  always-add: 'security-team'
  min-reviewers: 2
  selection-mode: 'random'
  add-top-contributor: false
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure the GitHub token has `pull-requests: write` permission
2. **Invalid Users**: Verify all usernames in `reviewer-list` are valid GitHub usernames
3. **Self-Assignment**: The action automatically excludes the PR author from reviewer selection

### Debug Mode

Enable debug logging by setting the `ACTIONS_STEP_DEBUG` secret to `true` in your repository.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run `npm run build` to update the distribution
6. Submit a pull request

## License

Apache License 2.0 - see [LICENSE](LICENSE) file for details.
