/**
 * 一键部署脚本 — 提交代码并推送到 GitHub
 * 用法: node deploy.js "提交信息"
 */
const { execSync } = require('child_process');
const path = require('path');

const msg = process.argv[2] || 'update';
const dir = __dirname;

function run(cmd) {
  try {
    return execSync(cmd, { cwd: dir, stdio: 'pipe', encoding: 'utf-8' }).trim();
  } catch (e) {
    return e.stderr?.trim() || e.message;
  }
}
function failed(res) { return res === undefined || res === null || (typeof res === 'string' && (res.includes('fatal:') || res.includes('error:') || res.includes('Permission denied'))); }

// ── 1. 检查 remote ──────────────────────────────────
const remote = run('git config --get remote.origin.url');
if (failed(remote) || !remote) {
  console.log('🔗 未配置远程仓库，请先在 GitHub 创建仓库后告诉我"部署"\n创建: https://github.com/new');
  process.exit(1);
}
console.log(`📦 远程: ${remote}`);

// ── 2. git add ──────────────────────────────────────
run('git add -A');
const status = run('git status --short');
if (!status) {
  console.log('✅ 没有新变更');
  process.exit(0);
}
console.log(`📝 ${status.split('\n').length} 个文件变更`);

// ── 3. commit & push ────────────────────────────────
run(`git commit -m "${msg.replace(/"/g, '\\"')}"`);
console.log('✅ 提交成功');

const push = run('git push');
if (failed(push)) {
  const push2 = run('git push -u origin main');
  if (failed(push2)) {
    console.error('❌ 推送失败:\n' + push2);
    process.exit(1);
  }
}
console.log('🚀 已推送到 GitHub!');
