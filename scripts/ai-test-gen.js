const http = require('http');
const fs = require('fs');
const path = require('path');

/**
 * Script to generate Jest + Supertest test suites using Ollama.
 * Usage: node scripts/ai-test-gen.js <file-path>
 */

const MODEL = 'deepseek-coder:6.7b'; 
const OLLAMA_URL = 'http://localhost:11434/api/generate';

async function main() {
  const targetFile = process.argv[2];

  if (!targetFile || !fs.existsSync(targetFile)) {
    console.error('❌ Error: Please provide a valid file path to test (e.g., backend/controllers/OrderController.js)');
    process.exit(1);
  }

  const fileContent = fs.readFileSync(targetFile, 'utf8');
  const fileName = path.basename(targetFile);
  
  // Calculate relative path for require()
  const testDir = path.join(path.dirname(targetFile), '../tests/generated');
  const relativePathToSource = path.relative(testDir, targetFile).replace(/\\/g, '/');

  console.log(`🧪 Generating tests for ${fileName} using Ollama (${MODEL})...`);

  const prompt = `
    You are a Senior QA Engineer. Generate a comprehensive Jest test suite for the file located at: ${relativePathToSource}
    
    IMPORTANT CONSTRAINTS:
    1. USE JEST ONLY. NO CHAI, NO SINON.
    2. The first line should correctly require the target file: 
       const target = require('${relativePathToSource.startsWith('.') ? relativePathToSource : './' + relativePathToSource}');
    3. Mock the '../utils/Logger' if it's imported in the source.
    4. Provide 3-5 high-value test cases.
    5. OUTPUT ONLY VALID JAVASCRIPT CODE. NO MARKDOWN. NO COMMENTS.
    
    SOURCE CODE:
    ${fileContent}
  `;

  try {
    const response = await postRequest(OLLAMA_URL, {
      model: MODEL,
      prompt: prompt,
      stream: false
    });

    let testCode = response.response.trim();
    
    // Improved code block stripping: Find content between ```javascript and ``` or ``` and ```
    const codeBlockMatch = testCode.match(/```(?:javascript)?\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      testCode = codeBlockMatch[1].trim();
    } else {
      // If no code blocks, try to remove common preamble phrases
      testCode = testCode.replace(/^(I'm sorry|Here is the|The error|Sure|Okay).*?\n/gi, '').trim();
    }
    
    // Determine output path
    const testDir = path.join(path.dirname(targetFile), '../tests/generated');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
    
    const testFile = path.join(testDir, fileName.replace('.js', '.generated.test.js'));
    fs.writeFileSync(testFile, testCode);

    console.log(`✅ Test suite generated successfully: ${testFile}`);
    console.log(`🚀 Run it with: cd backend && npx jest ${testFile}`);

  } catch (error) {
    console.error('❌ Error generating tests:', error.message);
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
