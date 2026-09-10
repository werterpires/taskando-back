import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import ts from 'typescript';

const sourceRoot = join(process.cwd(), 'src');
const outputRoot = join(process.cwd(), 'dist');

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.isFile() && extname(entry.name) === '.ts' ? [path] : [];
  });
}

rmSync(outputRoot, { recursive: true, force: true });

for (const sourcePath of sourceFiles(sourceRoot)) {
  const relativePath = relative(sourceRoot, sourcePath).replace(/\.ts$/, '.js');
  const outputPath = join(outputRoot, relativePath);
  const result = ts.transpileModule(readFileSync(sourcePath, 'utf8'), {
    fileName: sourcePath,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      esModuleInterop: true,
      sourceMap: true,
    },
  });

  const errors = result.diagnostics?.filter(({ category }) => category === ts.DiagnosticCategory.Error) ?? [];
  if (errors.length > 0) {
    const message = ts.formatDiagnosticsWithColorAndContext(errors, {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => process.cwd(),
      getNewLine: () => '\n',
    });
    throw new Error(message);
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, result.outputText);
  if (result.sourceMapText) writeFileSync(`${outputPath}.map`, result.sourceMapText);
}

console.log('Build de produção concluído.');
