const fs = require('fs');
const path = require('path');

const typesFile = path.join(__dirname, 'database.types.ts');
const outputFile = path.join(__dirname, 'DATABASE_SCHEMA.md');

try {
  const content = fs.readFileSync(typesFile, 'utf8');

  let schemaMd = '# Database Schema Documentation\n\nGenerated from Supabase Types\n\n';

  // simplistic parsing: find table definitions
  // Look for "Tables: {" block
  const tablesMatch = content.match(/Tables:\s*\{([\s\S]*?)\n\s{4}\}/);
  
  if (tablesMatch && tablesMatch[1]) {
    const tablesBlock = tablesMatch[1];
    // Split by table name (roughly "tableName: {")
    const tableRegex = /(\w+):\s*\{\s*Row:\s*\{([\s\S]*?)\}/g;
    let match;

    while ((match = tableRegex.exec(tablesBlock)) !== null) {
      const tableName = match[1];
      const rowContent = match[2];

      schemaMd += `## ${tableName}\n\n`;
      schemaMd += '| Column | Type | Nullable |\n';
      schemaMd += '|---|---|---|\n';

      // Parse columns: "columnName: type | null"
      const columnLines = rowContent.split('\n');
      for (const line of columnLines) {
        const colMatch = line.match(/^\s*(\w+):\s*(.+)$/);
        if (colMatch) {
          const colName = colMatch[1];
          let colType = colMatch[2].trim();
          const isNullable = colType.includes('null');
          
          // Clean up type string
          colType = colType.replace(' | null', '').replace(/['"]/g, '');

          schemaMd += `| ${colName} | \`${colType}\` | ${isNullable ? 'Yes' : 'No'} |\n`;
        }
      }
      schemaMd += '\n';
    }
  } else {
    schemaMd += 'Could not parse tables from types file.\n';
  }

  // Add Enums section
  const enumsMatch = content.match(/Enums:\s*\{([\s\S]*?)\n\s{4}\}/);
  if (enumsMatch && enumsMatch[1]) {
    schemaMd += '## Enums\n\n';
    const enumsBlock = enumsMatch[1];
    const enumRegex = /(\w+):\s*([\s\S]*?)(?=\n\s{6}\w+:|$)/g;
    
    // Simple line-based enum parsing for now
    // format: "enum_name: \n | 'val1'\n | 'val2'"
    // This part is tricky with regex, let's just dump the block content nicely or skip implementing complex enum parsing for brevity unless needed.
    // Let's try to capture names and values.
    
    const lines = enumsBlock.split('\n');
    let currentEnum = null;
    
    for (const line of lines) {
       const enumNameMatch = line.match(/^\s{6}(\w+):/);
       if (enumNameMatch) {
         if (currentEnum) schemaMd += '\n';
         currentEnum = enumNameMatch[1];
         schemaMd += `### ${currentEnum}\n\nValues:\n`;
         continue;
       }
       
       if (currentEnum && line.includes('|')) {
         const val = line.trim().replace(/^\|\s*/, '').replace(/['"]/g, '');
         schemaMd += `- ${val}\n`;
       }
    }
  }

  fs.writeFileSync(outputFile, schemaMd);
  console.log('Successfully generated DATABASE_SCHEMA.md');

} catch (err) {
  console.error('Error generating schema MD:', err);
  process.exit(1);
}
