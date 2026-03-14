const { execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

/**
 * Script to perform an AI-powered code review or file analysis using Ollama.
 */

const MODEL = 'deepseek-coder:6.7b'; 
const OLLAMA_URL = 'http://localhost:11434/api/generate';

async function main() {
  const targetFile = process.argv[2];
  let contentToReview = '';
  let mode = '';

  try {
    if (targetFile) {
      // Mode 1: Specific File Analysis
      if (!fs.existsSync(targetFile)) {
        console.error(`❌ Error: File not found: ${targetFile}`);
        process.exit(1);
      }
      console.log(`🔍 Analyzing file: ${targetFile}...`);
      const fileContent = fs.readFileSync(targetFile, 'utf8');
      contentToReview = `FILE CONTENT (${targetFile}):\n${fileContent}`;
      mode = 'Full File Analysis';
    } else {
      // Mode 2: Staged Changes
      console.log('🔍 Fetching staged changes...');
      let diff = execSync('git diff --cached').toString();

      if (!diff) {
        console.log('ℹ️ No staged changes found. Checking unstaged changes...');
        diff = execSync('git diff').toString();
      }

      if (!diff) {
        console.log('✅ No changes found in the repository.');
        console.log('💡 Usage: node scripts/ai-review.js <file-path> to analyze a specific file.');
        return;
      }

      contentToReview = `GIT DIFF:\n${diff}`;
      mode = 'Change Review (Diff)';
    }

    console.log(`🤖 Sending to Ollama (${MODEL}) [Mode: ${mode}]...`);

    const prompt = `
      You are a Senior Software Engineer specializing in Node.js, Express, and Supabase.
      Perform a deep technical review of the following ${mode}.
      
      Focus on:
      1. Logic bugs (especially in generic SaaS multi-tenancy and inventory/payments).
      2. Security (missing owner checks, SQL injection, sensitive data leaks).
      3. Edge cases (what happens if inputs are null, negative, or extremely large?).
      4. Architecture (DRY, SOLID, proper use of repositories/services).

      Be extremely concise. Use bullet points for issues and provide code snippets for fixes.

      ---
      ${contentToReview}
      ---
    `;

    const response = await postRequest(OLLAMA_URL, {
      model: MODEL,
      prompt: prompt,
      stream: false
    });

    console.log(`\n--- 🧠 AI ${mode.toUpperCase()} ---`);
    console.log(response.response);
    console.log('------------------------------------\n');

  } catch (error) {
    if (error.message.includes('ECONNREFUSED')) {
      console.error('❌ Error: Ollama is not running at http://localhost:11434');
    } else {
      console.error('❌ Error:', error.message);
    }
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
