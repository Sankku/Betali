const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * AI-AUTO-QA: Autonomous Testing Agent
 * Generates, runs, and self-heals tests for an entire directory.
 * Usage: node scripts/ai-auto-qa.js <directory-path>
 */

const MAX_HEALING_ATTEMPTS = 2; // How many times it will try to fix a failing test

async function runCommand(command, cwd = process.cwd()) {
  return new Promise((resolve) => {
    exec(command, { cwd, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      resolve({
        success: !error,
        output: stdout + '\n' + stderr,
        error: error
      });
    });
  });
}

async function main() {
  const targetDir = process.argv[2];

  if (!targetDir || !fs.existsSync(targetDir)) {
    console.error('❌ Error: Please provide a valid directory (e.g., backend/controllers)');
    process.exit(1);
  }

  console.log(`🤖 Starting Autonomous QA Agent on directory: ${targetDir}`);
  console.log(`=============================================================`);

  // 1. Get all JS files in the directory
  const files = fs.readdirSync(targetDir)
    .filter(file => file.endsWith('.js') && !file.includes('.test.') && !file.includes('index.js'))
    .map(file => path.join(targetDir, file));

  console.log(`📋 Found ${files.length} files to test.`);

  const results = { passed: [], failed: [] };

  for (const filePath of files) {
    const fileName = path.basename(filePath);
    const testFileName = fileName.replace('.js', '.generated.test.js');
    const testFilePath = `tests/generated/${testFileName}`;
    
    console.log(`\n⏳ Processing: ${fileName}...`);

    // STEP 1: Generate Test
    console.log(`   [1/3] Generating test suite...`);
    const genResult = await runCommand(`node scripts/ai-test-gen.js ${filePath}`);
    if (!genResult.success) {
      console.log(`   ❌ Failed to generate test for ${fileName}`);
      results.failed.push({ file: fileName, reason: 'Generation failed' });
      continue;
    }

    let isPassing = false;
    let attempts = 0;
    let lastError = '';

    // STEP 2 & 3: Run and Self-Heal Loop
    while (!isPassing && attempts <= MAX_HEALING_ATTEMPTS) {
      attempts++;
      console.log(`   [2/3] Running test (Attempt ${attempts}/${MAX_HEALING_ATTEMPTS + 1})...`);
      
      // Run specific test file, ignoring heavy global setup
      const testCmd = `npx jest ${testFilePath} --setupFilesAfterEnv="" --passWithNoTests=false`;
      const testResult = await runCommand(testCmd, path.join(process.cwd(), 'backend'));

      if (testResult.success) {
        console.log(`   ✅ PASS! Test suite for ${fileName} is solid.`);
        isPassing = true;
        results.passed.push(fileName);
      } else {
        // Extract the most relevant part of the error to avoid overloading the prompt
        const errorLines = testResult.output.split('\n');
        const summaryError = errorLines.filter(line => line.includes('Error:') || line.includes('FAIL') || line.includes('Expected') || line.includes('Received') || line.includes('SyntaxError')).slice(0, 10).join(' ');
        
        lastError = summaryError || "Unknown test failure";
        console.log(`   ⚠️ Test failed. Error: ${lastError.substring(0, 80)}...`);

        if (attempts <= MAX_HEALING_ATTEMPTS) {
          console.log(`   [3/3] 🔧 Self-Healing triggered... Asking AI to fix the test.`);
          // IMPORTANT: We heal the TEST file, assuming the source code is correct but the AI wrote a bad test.
          const healCmd = `node scripts/ai-fix.js backend/${testFilePath} "Fix this test failure. Keep it Jest pure. Error: ${lastError.replace(/"/g, "'")}"`;
          await runCommand(healCmd);
        }
      }
    }

    if (!isPassing) {
      console.log(`   ❌ Giving up on ${fileName} after ${attempts} attempts. Needs human review.`);
      results.failed.push({ file: fileName, reason: 'Failed all healing attempts', lastError });
    }
  }

  // Final Report
  console.log(`\n=============================================================`);
  console.log(`🏁 AUTONOMOUS QA RUN COMPLETED`);
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  
  if (results.failed.length > 0) {
    console.log(`\nFiles needing human review:`);
    results.failed.forEach(f => console.log(` - ${f.file} (${f.reason})`));
  }
}

main();
