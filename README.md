# SetMatrix GitHub Action

Dynamically generate a matrix JSON for GitHub Actions `matrix` strategy. Accepts comma-separated values, JSON arrays, JSON files, with filtering and include/exclude support.

## Inputs

| Input     | Required | Default  | Description |
|-----------|----------|----------|-------------|
| `values`  | No       | —        | Comma-separated values OR JSON array |
| `json`    | No       | —        | JSON array of objects for complex matrices |
| `file`    | No       | —        | Path to a JSON file with the matrix array |
| `name`    | No       | `value`  | Key name when using `values` input |
| `filter`  | No       | —        | Filter expression (e.g. `os!=windows`, `node>=18`) |
| `include` | No       | `[]`     | JSON array of additional combinations |
| `exclude` | No       | `[]`     | JSON array of combinations to remove |

## Outputs

| Output     | Description |
|------------|-------------|
| `matrix`   | JSON object ready for `fromJSON()` in matrix strategy |
| `length`   | Number of matrix combinations |
| `is_empty` | `true` if matrix has zero combinations |

## Examples

### Simple list

```yaml
jobs:
  setup:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.matrix.outputs.matrix }}
    steps:
      - id: matrix
        uses: skgandikota/SetMatrix@v1
        with:
          values: "ubuntu-latest,macos-latest,windows-latest"
          name: "os"

  build:
    needs: setup
    strategy:
      matrix: ${{ fromJSON(needs.setup.outputs.matrix) }}
    runs-on: ${{ matrix.os }}
    steps:
      - run: echo "Building on ${{ matrix.os }}"
```

### Complex multi-dimension matrix

```yaml
- id: matrix
  uses: skgandikota/SetMatrix@v1
  with:
    json: '[{"os":"ubuntu-latest","node":"18"},{"os":"ubuntu-latest","node":"20"},{"os":"macos-latest","node":"20"}]'
    exclude: '[{"os":"ubuntu-latest","node":"18"}]'
```

### Dynamic matrix from API

```yaml
- name: Get environments
  id: api
  uses: skgandikota/FetchUrl@v2
  with:
    url: "https://api.example.com/environments"

- name: Build matrix
  id: matrix
  uses: skgandikota/SetMatrix@v1
  with:
    json: "${{ steps.api.outputs.body }}"
    filter: "status==active"
```

### From file

```yaml
- uses: actions/checkout@v4
- id: matrix
  uses: skgandikota/SetMatrix@v1
  with:
    file: ".github/matrix.json"
```

## License

MIT
