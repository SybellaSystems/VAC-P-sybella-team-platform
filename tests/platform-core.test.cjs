const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

function loadTypeScriptModule(relativePath) {
  const filename = path.join(__dirname, '..', relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const loaded = { exports: {} };
  new Function('module', 'exports', output)(loaded, loaded.exports);
  return loaded.exports;
}

const { calculateAchievementPercent, monthKey, recentMonthKeys } = loadTypeScriptModule('lib/performance.ts');
const { isProfileRouteAllowed, navSectionsForProfile } = loadTypeScriptModule('lib/rbac.ts');

test('KPI achievement respects higher, lower, and binary measurement directions', () => {
  assert.equal(calculateAchievementPercent(6, 10, 'higher'), 60);
  assert.equal(calculateAchievementPercent(12, 10, 'higher'), 120);
  assert.equal(calculateAchievementPercent(5, 10, 'lower'), 200);
  assert.equal(calculateAchievementPercent(20, 10, 'lower'), 50);
  assert.equal(calculateAchievementPercent(1, 1, 'binary'), 100);
  assert.equal(calculateAchievementPercent(0, 1, 'binary'), 0);
});

test('KPI achievement handles zero targets and invalid values safely', () => {
  assert.equal(calculateAchievementPercent(0, 0, 'higher'), 100);
  assert.equal(calculateAchievementPercent(4, 0, 'lower'), 0);
  assert.equal(calculateAchievementPercent(0, 0, 'lower'), 100);
  assert.equal(calculateAchievementPercent(Number.NaN, 1, 'higher'), null);
  assert.equal(calculateAchievementPercent(1, -1, 'higher'), null);
});

test('reporting period helpers produce stable local calendar periods', () => {
  assert.equal(monthKey('2026-11-16'), '2026-11');
  assert.deepEqual(recentMonthKeys(3, new Date(2026, 10, 16)), ['2026-09', '2026-10', '2026-11']);
});

test('role navigation exposes the core modules and blocks retired duplicate-tool routes', () => {
  const member = { role: 'intern', department: 'Tech' };
  const hrefs = navSectionsForProfile(member).flatMap((section) => section.items.map((item) => item.href));
  assert.deepEqual(hrefs, ['/dashboard', '/analytics', '/goals', '/daily-progress', '/daily-approvals', '/reports', '/team', '/profile']);
  assert.equal(isProfileRouteAllowed(member, '/team/123'), true);
  assert.equal(isProfileRouteAllowed(member, '/messages'), false);
  assert.equal(isProfileRouteAllowed(member, '/drive'), false);
  assert.equal(isProfileRouteAllowed(member, '/admin'), false);
  assert.equal(isProfileRouteAllowed({ role: 'admin', department: '' }, '/admin/departments'), true);
  assert.equal(isProfileRouteAllowed({ role: 'admin', department: '' }, '/administer'), false);
});
