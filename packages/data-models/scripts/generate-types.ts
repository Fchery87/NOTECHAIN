#!/usr/bin/env bun
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const schemaPath = resolve(process.cwd(), 'packages/data-models/prisma/schema.prisma');
const outputPath = resolve(process.cwd(), 'packages/data-models/src/database.types.ts');

if (!existsSync(schemaPath)) {
  console.error('Prisma schema not found at:', schemaPath);
  process.exit(1);
}

const schema = readFileSync(schemaPath, 'utf-8');

const typeMappings: Record<string, string> = {
  String: 'string',
  Int: 'number',
  BigInt: 'bigint',
  Float: 'number',
  Boolean: 'boolean',
  DateTime: 'Date',
  ByteArray: 'Uint8Array',
  Decimal: 'number',
  Json: 'Record<string, unknown>',
};

function parseModel(modelBlock: string): {
  name: string;
  fields: Array<{
    name: string;
    type: string;
    isOptional: boolean;
    isList: boolean;
  }>;
} {
  const nameMatch = modelBlock.match(/model\s+(\w+)/);
  if (!nameMatch) return { name: '', fields: [] };

  const name = nameMatch[1];
  const fields: Array<{
    name: string;
    type: string;
    isOptional: boolean;
    isList: boolean;
  }> = [];

  const fieldRegex =
    /(\w+)\s+(\w+)(?:\?)?(?:\s+@db\.\w+)?(?:\s+@default\([^)]*\))?(?:\s+@id)?(?:\s+@unique)?(?:\s+@relation[^;]*)?(?:\s+@db\.\w+)?/g;

  let match;
  while ((match = fieldRegex.exec(modelBlock)) !== null) {
    const [, fieldName, fieldType] = match;
    const isOptional = modelBlock.includes(`${fieldName} ${fieldType}?`);
    const isList = modelBlock.includes(`${fieldName} ${fieldType}[]`);

    let tsType = typeMappings[fieldType] || fieldType;
    if (isList) {
      tsType = isOptional ? `${tsType}[] | null` : `${tsType}[]`;
    } else if (isOptional) {
      tsType = `${tsType} | null`;
    }

    fields.push({ name: fieldName, type: tsType, isOptional, isList });
  }

  return { name, fields };
}

function generateTypes(schema: string): string {
  const models = schema.match(/model\s+\w+\s*{[^}]*}/g) || [];

  let typesOutput = `// Auto-generated from Prisma schema - DO NOT EDIT
// Generated: ${new Date().toISOString()}

export interface Database {
`;

  for (const model of models) {
    const { name, fields } = parseModel(model);
    if (!name) continue;

    typesOutput += `  ${name}: {\n`;
    for (const field of fields) {
      const optionalMarker = field.isOptional && !field.isList ? '?' : '';
      typesOutput += `    ${field.name}${optionalMarker}: ${field.type};\n`;
    }
    typesOutput += `  };\n`;
  }

  typesOutput += `}\n\n`;

  typesOutput += `export type Tables = Database[keyof Database];\n\n`;

  for (const model of models) {
    const { name } = parseModel(model);
    if (!name) continue;

    typesOutput += `export type ${name} = Database['${name}'];
`;
  }

  return typesOutput;
}

const typesOutput = generateTypes(schema);
writeFileSync(outputPath, typesOutput);

console.log(`Generated types at: ${outputPath}`);
console.log('Done!');
