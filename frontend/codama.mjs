import { createFromRoot } from "codama";
import { rootNodeFromAnchor } from "@codama/nodes-from-anchor";
import { renderVisitor } from "@codama/renderers-js";
import { readFileSync } from "fs";

const idl = JSON.parse(readFileSync("./idl/aegis_program.json", "utf-8"));

const codama = createFromRoot(rootNodeFromAnchor(idl));

codama.accept(
  renderVisitor("./lib/generated", {
    formatCode: false,
    generatedFolder: ".",
    syncPackageJson: false,
  })
);
