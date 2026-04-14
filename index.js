const core = require("@actions/core");
const fs = require("fs");

function matchesExclude(item, exclude) {
  return exclude.some((ex) =>
    Object.entries(ex).every(([k, v]) => item[k] === v)
  );
}

function applyFilter(items, filter) {
  if (!filter) return items;

  const match = filter.match(/^(\w+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  if (!match) {
    core.warning(`Invalid filter syntax: ${filter}. Expected: key==value, key!=value, key>=value`);
    return items;
  }

  const [, key, op, rawVal] = match;

  return items.filter((item) => {
    const itemVal = item[key];
    if (itemVal === undefined) return true;

    const numItem = Number(itemVal);
    const numVal = Number(rawVal);
    const useNum = !isNaN(numItem) && !isNaN(numVal);

    switch (op) {
      case "==": return String(itemVal) === rawVal;
      case "!=": return String(itemVal) !== rawVal;
      case ">=": return useNum && numItem >= numVal;
      case "<=": return useNum && numItem <= numVal;
      case ">": return useNum && numItem > numVal;
      case "<": return useNum && numItem < numVal;
      default: return true;
    }
  });
}

async function run() {
  try {
    const valuesStr = core.getInput("values") || "";
    const jsonStr = core.getInput("json") || "";
    const filePath = core.getInput("file") || "";
    const name = core.getInput("name") || "value";
    const filter = core.getInput("filter") || "";
    const include = JSON.parse(core.getInput("include") || "[]");
    const exclude = JSON.parse(core.getInput("exclude") || "[]");

    let items = [];

    if (filePath) {
      const content = fs.readFileSync(filePath, "utf-8");
      items = JSON.parse(content);
    } else if (jsonStr) {
      items = JSON.parse(jsonStr);
    } else if (valuesStr) {
      // Could be JSON array or comma-separated
      if (valuesStr.trim().startsWith("[")) {
        const arr = JSON.parse(valuesStr);
        items = arr.map((v) => ({ [name]: v }));
      } else {
        items = valuesStr.split(",").map((v) => ({ [name]: v.trim() }));
      }
    }

    if (!Array.isArray(items)) {
      throw new Error("Matrix input must be an array");
    }

    // Normalize: if items are primitives, wrap in objects
    items = items.map((item) =>
      typeof item === "object" && item !== null ? item : { [name]: item }
    );

    // Apply filter
    items = applyFilter(items, filter);

    // Apply excludes
    if (exclude.length > 0) {
      items = items.filter((item) => !matchesExclude(item, exclude));
    }

    // Apply includes
    items = [...items, ...include];

    // Build matrix object with keys
    const keys = new Set();
    items.forEach((item) => Object.keys(item).forEach((k) => keys.add(k)));

    const matrix = {};
    if (keys.size === 1 && items.every((item) => Object.keys(item).length === 1)) {
      // Simple single-dimension matrix
      const key = [...keys][0];
      matrix[key] = items.map((item) => item[key]);
    } else {
      // Complex multi-dimension: use include strategy
      matrix.include = items;
    }

    const matrixJson = JSON.stringify(matrix);
    core.setOutput("matrix", matrixJson);
    core.setOutput("length", String(items.length));
    core.setOutput("is_empty", String(items.length === 0));
    core.info(`Matrix (${items.length} combinations): ${matrixJson}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
