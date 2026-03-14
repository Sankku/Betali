const http = require('http');
const fs = require('fs');
const path = require('path');

/**
 * AI-FIX: Automagically fix code errors using Ollama.
 * Usage: node scripts/ai-fix.js <file-path> "<error-message-or-context>"
 */

const MODEL = 'deepseek-coder:6.7b'; 
const OLLAMA_URL = 'http://localhost:11434/api/generate';

async function main() {
  const targetFile = process.argv[2];
  const errorMessage = process.argv[3];

  if (!targetFile || !fs.existsSync(targetFile) || !errorMessage) {
    console.error('❌ Error: Usage: node scripts/ai-fix.js <file-path> "<error-message>"');
    process.exit(1);
  }

  const fileContent = fs.readFileSync(targetFile, 'utf8');
  const fileName = path.basename(targetFile);

  console.log(`🔧 Attempting to fix ${fileName} using Ollama (${MODEL})...`);
  console.log(`🐞 Error context: ${errorMessage.substring(0, 100)}...`);

  const prompt = `
    You are a Senior Software Engineer. I have a bug in my code.
    
    FILE: ${fileName}
    ERROR/CONTEXT: ${errorMessage}
    
    SOURCE CODE:
    ${fileContent}
    
    TASK:
    1. Analyze the error and the source code.
    2. Fix the bug while maintaining the existing logic and multi-tenant security.
    3. Output ONLY the complete, valid, and updated source code for the file. 
    4. DO NOT explain anything. DO NOT use markdown code blocks like \`\`\`javascript. Just the raw code.
  `;

  try {
    const response = await postRequest(OLLAMA_URL, {
      model: MODEL,
      prompt: prompt,
      stream: false
    });

    let fixedCode = response.response.trim();
    
    // Improved code block stripping
    const codeBlockMatch = fixedCode.match(/```(?:javascript)?\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      fixedCode = codeBlockMatch[1].trim();
    } else {
      // If no code blocks, remove common preamble phrases
      fixedCode = fixedCode.replace(/^(I'm sorry|Here is the|The error|Sure|Okay|Based on).*?\n/gi, '').trim();
      // Remove everything before the first 'const', 'require', 'import', or 'describe'
      const firstValidLineMatch = fixedCode.match(/(?:const|require|import|describe|module\.exports)[\s\S]*/);
      if (firstValidLineMatch) {
        fixedCode = firstValidLineMatch[0];
      }
    }

    // Backup original file
    const backupFile = `${targetFile}.bak`;
    fs.writeFileSync(backupFile, fileContent);
    console.log(`📦 Backup created: ${backupFile}`);

    // Overwrite with fixed code
    fs.writeFileSync(targetFile, fixedCode);

    console.log(`✅ File ${fileName} has been updated with the AI fix.`);
    console.log(`🧪 Now, run your tests to verify the fix!`);

  } catch (error) {
    console.error('❌ Error during AI fix:', error.message);
  }
}

function postRequest(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error('Failed to parse Ollama response: ' + body));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(JSON.stringify(data));
    req.end();
  });
}

main();
