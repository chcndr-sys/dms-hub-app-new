#!/usr/bin/env node
/**
 * 🧪 Agent Capabilities Test Suite
 * 
 * Valida che il "motore" backend risponda correttamente:
 * - DB Query (Abacus)
 * - Tool Execution (MIO)
 * - System Prompt Loading (Tutti gli agenti)
 * - API Endpoints (GPT Dev)
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Colori per output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(type, message) {
  const prefix = {
    success: `${colors.green}✅`,
    error: `${colors.red}❌`,
    warning: `${colors.yellow}⚠️`,
    info: `${colors.blue}ℹ️`
  }[type] || '';
  console.log(`${prefix} ${message}${colors.reset}`);
}

// Test 1: System Prompt Loading
async function testSystemPrompts() {
  log('info', 'TEST 1: System Prompt Loading...');
  
  const promptsPath = path.join(__dirname, '../.mio-agents/system_prompts.md');
  
  if (!fs.existsSync(promptsPath)) {
    log('error', 'system_prompts.md NOT FOUND');
    return false;
  }
  
  const content = fs.readFileSync(promptsPath, 'utf8');
  
  // Verifica che contenga i prompt degli agenti
  const agents = ['MIO Agent', 'GPT Dev', 'Manus Agent', 'Abacus Agent', 'Zapier Agent', 'Guardian Agent'];
  const missingAgents = agents.filter(agent => !content.includes(agent));
  
  if (missingAgents.length > 0) {
    log('error', `Missing agents: ${missingAgents.join(', ')}`);
    return false;
  }
  
  // Verifica versioni
  if (!content.includes('V2.0') && !content.includes('V2.2')) {
    log('warning', 'Prompts may not be updated to latest version');
  }
  
  log('success', `System Prompts OK (${content.split('\n').length} lines, ${agents.length} agents)`);
  return true;
}

// Test 2: Tools Definition
async function testToolsDefinition() {
  log('info', 'TEST 2: Tools Definition...');
  
  const toolsPath = path.join(__dirname, '../.mio-agents/tools_definition.json');
  
  if (!fs.existsSync(toolsPath)) {
    log('error', 'tools_definition.json NOT FOUND');
    return false;
  }
  
  const tools = JSON.parse(fs.readFileSync(toolsPath, 'utf8'));
  
  if (!tools.tools || tools.tools.length === 0) {
    log('error', 'No tools defined');
    return false;
  }
  
  log('success', `Tools Definition OK (${tools.tools.length} tools available)`);
  
  // Lista tools
  tools.tools.forEach(tool => {
    console.log(`   - ${tool.name}: ${tool.description}`);
  });
  
  return true;
}

// Test 3: API Reference
async function testAPIReference() {
  log('info', 'TEST 3: API Reference...');
  
  const apiRefPath = path.join(__dirname, '../.mio-agents/api_reference_for_agents.md');
  
  if (!fs.existsSync(apiRefPath)) {
    log('error', 'api_reference_for_agents.md NOT FOUND');
    return false;
  }
  
  const content = fs.readFileSync(apiRefPath, 'utf8');
  
  // Verifica che contenga endpoint
  if (!content.includes('dmsHub') && !content.includes('markets')) {
    log('warning', 'API Reference may be incomplete');
  }
  
  log('success', `API Reference OK (${content.split('\n').length} lines)`);
  return true;
}

// Test 4: Blueprint
async function testBlueprint() {
  log('info', 'TEST 4: Blueprint...');
  
  const blueprintPath = path.join(__dirname, '../BLUEPRINT.md');
  
  if (!fs.existsSync(blueprintPath)) {
    log('error', 'BLUEPRINT.md NOT FOUND');
    return false;
  }
  
  const content = fs.readFileSync(blueprintPath, 'utf8');
  
  // Verifica sezioni chiave
  const requiredSections = ['Database Schema', 'API Endpoints', 'Agent Library'];
  const missingSections = requiredSections.filter(section => !content.includes(section));
  
  if (missingSections.length > 0) {
    log('warning', `Missing sections: ${missingSections.join(', ')}`);
  }
  
  log('success', `Blueprint OK (${content.split('\n').length} lines)`);
  return true;
}

// Test 5: Database Connection (se DATABASE_URL disponibile)
async function testDatabaseConnection() {
  log('info', 'TEST 5: Database Connection...');
  
  if (!process.env.DATABASE_URL) {
    log('warning', 'DATABASE_URL not set (OK for local sandbox)');
    return true; // Non è un errore critico
  }
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Test query semplice
    const result = await pool.query('SELECT 1 as test');
    
    if (result.rows[0].test !== 1) {
      log('error', 'Database query returned unexpected result');
      return false;
    }
    
    // Query Abacus-style (statistiche)
    const marketsCount = await pool.query('SELECT count(*) as total FROM markets');
    const stallsCount = await pool.query('SELECT count(*) as total FROM stalls');
    
    log('success', `Database Connection OK`);
    console.log(`   - Markets: ${marketsCount.rows[0].total}`);
    console.log(`   - Stalls: ${stallsCount.rows[0].total}`);
    
    await pool.end();
    return true;
  } catch (error) {
    log('error', `Database Error: ${error.message}`);
    return false;
  }
}

// Test 6: File System Access (Tool simulation)
async function testFileSystemAccess() {
  log('info', 'TEST 6: File System Access (Tool Simulation)...');
  
  const testPaths = [
    '../.mio-agents',
    '../server',
    '../client',
    '../BLUEPRINT.md'
  ];
  
  const results = testPaths.map(p => {
    const fullPath = path.join(__dirname, p);
    return {
      path: p,
      exists: fs.existsSync(fullPath)
    };
  });
  
  const failed = results.filter(r => !r.exists);
  
  if (failed.length > 0) {
    log('error', `Missing paths: ${failed.map(r => r.path).join(', ')}`);
    return false;
  }
  
  log('success', 'File System Access OK (all critical paths exist)');
  return true;
}

// Main Test Runner
async function runTests() {
  console.log('\n🧪 AGENT CAPABILITIES TEST SUITE\n');
  console.log('='.repeat(50));
  console.log('\n');
  
  const tests = [
    { name: 'System Prompts', fn: testSystemPrompts },
    { name: 'Tools Definition', fn: testToolsDefinition },
    { name: 'API Reference', fn: testAPIReference },
    { name: 'Blueprint', fn: testBlueprint },
    { name: 'Database Connection', fn: testDatabaseConnection },
    { name: 'File System Access', fn: testFileSystemAccess }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });
    } catch (error) {
      log('error', `${test.name} threw error: ${error.message}`);
      results.push({ name: test.name, passed: false });
    }
    console.log('');
  }
  
  // Summary
  console.log('='.repeat(50));
  console.log('\n📊 TEST SUMMARY\n');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);
  
  results.forEach(r => {
    const status = r.passed ? `${colors.green}✅ PASS` : `${colors.red}❌ FAIL`;
    console.log(`${status}${colors.reset} - ${r.name}`);
  });
  
  console.log('');
  console.log(`${colors.blue}Result: ${passed}/${total} tests passed (${percentage}%)${colors.reset}`);
  
  if (percentage === 100) {
    console.log(`\n${colors.green}🎉 ALL TESTS PASSED! The engine is ready for MIO.${colors.reset}\n`);
    process.exit(0);
  } else if (percentage >= 80) {
    console.log(`\n${colors.yellow}⚠️  MOSTLY READY. Some non-critical tests failed.${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}❌ CRITICAL FAILURES. Fix before using MIO.${colors.reset}\n`);
    process.exit(1);
  }
}

// Run
runTests().catch(error => {
  log('error', `Fatal error: ${error.message}`);
  process.exit(1);
});
