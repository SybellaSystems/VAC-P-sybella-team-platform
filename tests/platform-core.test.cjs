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
const {
  canApproveLeave,
  canManageShares,
  isAdminProfile,
  isProfileRouteAllowed,
  navSectionsForProfile,
} = loadTypeScriptModule('lib/rbac.ts');

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

test('executive department profile receives admin navigation and controls only in that department', () => {
  const executive = { role: 'executive', department: 'Executive' };
  const executiveRoutes = navSectionsForProfile(executive).flatMap((section) => section.items.map((item) => item.href));

  assert.equal(isAdminProfile(executive), true);
  assert.equal(executiveRoutes.includes('/admin'), true);
  assert.equal(executiveRoutes.includes('/admin/departments'), true);
  assert.equal(isProfileRouteAllowed(executive, '/audit-logs'), true);
  assert.equal(canManageShares(executive), true);
  assert.equal(canApproveLeave(executive), true);
  assert.equal(isAdminProfile({ role: 'executive', department: 'Executive Department' }), true);
  assert.equal(isAdminProfile({ role: 'executive', department: 'Technical' }), false);
  assert.equal(isProfileRouteAllowed({ role: 'executive', department: 'Technical' }, '/admin'), false);
  assert.equal(canManageShares({ role: 'executive', department: 'Technical' }), false);
});

test('legacy project integration credentials are retained but inaccessible to authenticated users', () => {
  const migrationDirectory = path.join(__dirname, '..', 'supabase', 'migrations');
  const foundationMigration = fs.readFileSync(
    path.join(migrationDirectory, '20261116000000_vacp_operations_performance_foundation.sql'),
    'utf8'
  );
  const accessMigration = fs.readFileSync(
    path.join(migrationDirectory, '20261116120000_lock_retired_project_integrations.sql'),
    'utf8'
  );

  assert.doesNotMatch(foundationMigration, /DROP TABLE IF EXISTS public\.project_integrations/i);
  assert.match(accessMigration, /AS RESTRICTIVE FOR ALL TO authenticated USING \(false\) WITH CHECK \(false\)/i);
});

test('database administrator privileges require the executive role and Executive department', () => {
  const migration = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', 'migrations', '20261116123000_executive_department_admin_access.sql'),
    'utf8'
  );

  assert.match(migration, /profile\.role = 'executive'/i);
  assert.match(migration, /lower\(trim\(coalesce\(profile\.department, ''\)\)\) IN \('executive', 'executive department'\)/i);
  assert.match(migration, /CREATE POLICY %I ON public\.%I FOR ALL TO authenticated USING \(public\.vacp_is_admin\(\)\)/i);
  assert.doesNotMatch(migration, /role IN \('admin', 'director', 'ceo', 'executive'\)/i);
});

test('administrator email and broadcast endpoints require verified admin authorization', () => {
  const emailRoute = fs.readFileSync(path.join(__dirname, '..', 'app', 'api', 'email', 'route.ts'), 'utf8');
  const broadcastRoute = fs.readFileSync(path.join(__dirname, '..', 'app', 'api', 'notifications', 'broadcast', 'route.ts'), 'utf8');
  const notificationsPage = fs.readFileSync(path.join(__dirname, '..', 'app', '(app)', 'notifications', 'page.tsx'), 'utf8');

  assert.match(emailRoute, /authorizeAdmin\(request\)/);
  assert.match(broadcastRoute, /authorizeAdmin\(request\)/);
  assert.match(notificationsPage, /Authorization:\s*`Bearer \$\{data\.session\.access_token\}`/);
});
