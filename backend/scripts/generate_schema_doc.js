const fs = require('fs');
const path = require('path');

const typesFilePath = path.join(__dirname, '../database.types.ts');
const outputFilePath = path.join(__dirname, '../DATABASE_SCHEMA.md');

try {
  const content = fs.readFileSync(typesFilePath, 'utf8');

  let markdown = '# Database Schema Documentation\n\nGenerated from `database.types.ts`.\n\n';

  // Extract the "Tables" section
  const tablesMatch = content.match(/Tables:\s*{([\s\S]*?)}\s*Views:/);
  
  if (tablesMatch && tablesMatch[1]) {
    const tablesBlock = tablesMatch[1];

    // Split into individual table blocks
    // Pattern: tableName: { ... Row: { ... } ... }
    // We can split by indentation level or just find "      tableName: {"
    
    // Let's create a regex to find table starts
    const tableStarts = [...tablesBlock.matchAll(/^\s{6}(\w+):/gm)];
    
    for (let i = 0; i < tableStarts.length; i++) {
        const tableName = tableStarts[i][1];
        const startIndex = tableStarts[i].index;
        const endIndex = (i < tableStarts.length - 1) ? tableStarts[i+1].index : tablesBlock.length;
        
        const tableContent = tablesBlock.substring(startIndex, endIndex);

        // Find the "Row: {" block within this table
        const rowMatch = tableContent.match(/Row:\s*{([\s\S]*?)}/);

        if (rowMatch && rowMatch[1]) {
            markdown += `## ${tableName}\n\n`;
            markdown += '| Column | Type | Nullable |\n';
            markdown += '|---|---|---|\n';

            const columnLines = rowMatch[1].split('\n').filter(line => line.trim());
            
            for (const line of columnLines) {
                // Parse: columnName: type | null
                const parts = line.match(/^\s*(\w+):\s*(.+)$/);
                if (parts) {
                    const colName = parts[1];
                    let colTypeSpec = parts[2];
                    
                    const isNullable = colTypeSpec.includes('null') || colTypeSpec.includes('?');
                    let colType = colTypeSpec.replace(' | null', '').replace(/['"]/g, '');
                    
                    // Simple type cleanup
                    if (colType.includes('Database["public"]["Enums"]')) {
                        colType = "ENUM (" + colType.split('.').pop().replace(/[\[\]"]/g, '') + ")";
                    }

                    markdown += `| ${colName} | \`${colType}\` | ${isNullable ? 'Yes' : 'No'} |\n`;
                }
            }
            markdown += '\n';
        }
    }
  } else {
    markdown += '> Could not parse Tables section from definition file.\n';
  }
  
  // Enums
  const enumsMatch = content.match(/Enums:\s*{([\s\S]*?)}\s*CompositeTypes:/);
  if (enumsMatch && enumsMatch[1]) {
      markdown += '## Enums\n\n';
      const enumsBlock = enumsMatch[1];
      const enumStarts = [...enumsBlock.matchAll(/^\s{6}(\w+):/gm)];

      for (let i = 0; i < enumStarts.length; i++) {
          const enumName = enumStarts[i][1];
          const startIndex = enumStarts[i].index;
          const endIndex = (i < enumStarts.length - 1) ? enumStarts[i+1].index : enumsBlock.length;
          
          const enumContent = enumsBlock.substring(startIndex, endIndex);
          markdown += `### ${enumName}\n`;
          
          const values = enumContent.match(/\|\s*"([^"]+)"/g);
          if (values) {
              values.forEach(val => {
                  markdown += `- ${val.replace(/[|"\s]/g, '')}\n`;
              });
          }
           markdown += '\n';
      }
  }

  fs.writeFileSync(outputFilePath, markdown);
  console.log('Successfully generated DATABASE_SCHEMA.md');

} catch (err) {
  console.error('Error generating MD:', err);
  process.exit(1);
}
