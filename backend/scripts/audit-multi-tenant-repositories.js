/**
 * Audit Multi-Tenant Repositories
 * Verifies that all repositories properly filter by organization_id
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const repositoriesPath = path.join(__dirname, '../repositories');
const repositories = fs.readdirSync(repositoriesPath).filter(f => f.endsWith('.js'));

console.clear();
log('\n🔍 MULTI-TENANT REPOSITORY AUDIT', 'cyan');
log('='.repeat(70), 'cyan');
log('Verifying organization_id usage in all repositories\n', 'blue');

const results = {
  total: 0,
  compliant: 0,
  warnings: 0,
  critical: 0,
  details: []
};

// Repositories that should be excluded from org_id requirement
const EXCLUDED_REPOS = [
  'OrganizationRepository.js',  // Manages organizations themselves
  'UserOrganizationRepository.js', // Junction table
  'BaseRepository.js' // Base class
];

repositories.forEach(repoFile => {
  if (EXCLUDED_REPOS.includes(repoFile)) {
    log(`⚪ Skipping ${repoFile} (excluded from audit)`, 'blue');
    return;
  }

  results.total++;
  const filePath = path.join(repositoriesPath, repoFile);
  const content = fs.readFileSync(filePath, 'utf8');

  const issues = [];
  let hasOrgIdFilter = false;
  let hasSelectMethod = false;
  let hasFindMethod = false;

  // Check for organization_id in the file
  if (content.includes('organization_id') || content.includes('organizationId')) {
    hasOrgIdFilter = true;
  }

  // Check for methods that should filter by org_id
  if (content.match(/\.select\(/g)) {
    hasSelectMethod = true;
  }

  if (content.match(/find.*\(/gi)) {
    hasFindMethod = true;
  }

  // Check for dangerous patterns (queries without organization_id)
  const dangerousPatterns = [
    { pattern: /\.from\([^)]+\)\.select\([^)]*\)(?!.*\.eq\(['"]organization_id)/g, desc: 'SELECT without organization_id filter' },
    { pattern: /\.from\([^)]+\)\.update\([^)]*\)(?!.*\.eq\(['"]organization_id)/g, desc: 'UPDATE without organization_id filter' },
    { pattern: /\.from\([^)]+\)\.delete\([^)]*\)(?!.*\.eq\(['"]organization_id)/g, desc: 'DELETE without organization_id filter' }
  ];

  let severity = 'compliant';

  if (!hasOrgIdFilter && (hasSelectMethod || hasFindMethod)) {
    issues.push('No organization_id filtering detected');
    severity = 'critical';
  }

  // More detailed analysis for specific patterns
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    // Check for .select() without .eq('organization_id')
    if (line.includes('.select(') && !line.includes('//')) {
      // Look ahead in next few lines for organization_id
      const contextLines = lines.slice(index, Math.min(index + 5, lines.length)).join(' ');
      if (!contextLines.includes('organization_id') && !contextLines.includes('organizationId')) {
        issues.push(`Line ${index + 1}: SELECT without organization_id (possibly unsafe)`);
        if (severity === 'compliant') severity = 'warning';
      }
    }
  });

  // Store results
  results.details.push({
    file: repoFile,
    severity,
    issues,
    hasOrgIdFilter
  });

  // Log result
  if (severity === 'compliant') {
    log(`✅ ${repoFile}`, 'green');
    results.compliant++;
  } else if (severity === 'warning') {
    log(`⚠️  ${repoFile}`, 'yellow');
    results.warnings++;
    issues.forEach(issue => log(`   - ${issue}`, 'yellow'));
  } else {
    log(`❌ ${repoFile}`, 'red');
    results.critical++;
    issues.forEach(issue => log(`   - ${issue}`, 'red'));
  }
});

// Summary
console.log('\n' + '='.repeat(70));
log('📊 AUDIT SUMMARY', 'cyan');
console.log('='.repeat(70));

log(`\nTotal Repositories Audited: ${results.total}`, 'bright');
log(`Compliant: ${results.compliant}`, 'green');
log(`Warnings: ${results.warnings}`, 'yellow');
log(`Critical Issues: ${results.critical}`, results.critical > 0 ? 'red' : 'green');

const complianceRate = ((results.compliant / results.total) * 100).toFixed(1);
log(`\nCompliance Rate: ${complianceRate}%`, complianceRate >= 90 ? 'green' : 'yellow');

if (results.critical > 0) {
  log('\n🚨 CRITICAL: Some repositories do not filter by organization_id!', 'red');
  log('This could lead to data leakage between organizations.', 'red');
  log('\nCritical repositories:', 'red');
  results.details
    .filter(r => r.severity === 'critical')
    .forEach(r => log(`  - ${r.file}`, 'red'));
} else if (results.warnings > 0) {
  log('\n⚠️  Some repositories have potential issues:', 'yellow');
  results.details
    .filter(r => r.severity === 'warning')
    .forEach(r => log(`  - ${r.file}`, 'yellow'));
} else {
  log('\n✅ All repositories appear to be multi-tenant compliant!', 'green');
}

log('\n💡 Recommendations:', 'cyan');
log('1. All SELECT queries should include .eq("organization_id", organizationId)', 'blue');
log('2. All UPDATE queries should include organization_id in WHERE clause', 'blue');
log('3. All DELETE queries should include organization_id in WHERE clause', 'blue');
log('4. Use BaseRepository methods when possible (they handle org_id)', 'blue');
log('5. Add integration tests for each repository', 'blue');

console.log('\n');

process.exit(results.critical > 0 ? 1 : 0);
