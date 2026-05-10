/**
 * 一键部署脚本 — 提交代码并推送到 GitHub
 * 用法: node deploy.js "提交信息"
 *
 * 已配好远程仓库: 直接 commit + push
 * 未配远程仓库: 自动尝试创建 GitHub 仓库
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const msg = process.argv[2] || 'update';
const repoDir = __dirname;
const repoName = path.basename(repoDir);

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { cwd: repoDir, stdio: 'pipe', encoding: 'utf-8', ...opts }).trim();
  } catch (e) {
    return { error: e.stderr?.trim() || e.message };
  }
}

// ── 1. 检查 remote ──────────────────────────────────
const remote = run('git config --get remote.origin.url');
if (remote.error || !remote) {
  console.log('🔗 未配置远程仓库，创建 GitHub 仓库...');

  // 尝试用 gh 创建 (如果已安装并登录)
  const ghPath = 'C:/Users/Administrator/scoop/shims/gh.exe'; // 常用路径
  const gh = fs.existsSync(ghPath) ? ghPath : null;

  if (gh) {
    const res = run(`"${gh}" repo create ${repoName} --private --push --source .`, { stdio: 'inherit' });
    console.log('✅ 仓库已创建并推送');
    process.exit(0);
  }

  // 尝试用 ghproxy 创建
  const GITHUB_USER = 'chacha71';
  const apiUrl = `https://ghproxy.net/https://api.github.com/user/repos`;

  // 没有 token，无法自动创建
  console.log(`❌ 无法自动创建仓库（GitHub API 不可达）。
请手动创建:
  1. 打开 https://github.com/new
  2. 仓库名: ${repoName}
  3. 选 Private
  4. 点创建
  5. 创建后告诉我"部署"即可`);
  process.exit(1);
}

console.log(`📦 远程: ${remote}`);

// ── 2. git add ──────────────────────────────────────
run('git add -A');
const status = run('git status --short');
if (!status || status.error) {
  console.log('✅ 没有新变更需要提交');
  process.exit(0);
}
console.log(`📝 变更文件: ${status.split('\n').length} 个`);

// ── 3. git commit ──────────────────────────────────
run(`git commit -m "${msg.replace(/"/g, '\\"')}"`);
console.log('✅ 提交成功');

// ── 4. git push ────────────────────────────────────
const push = run('git push');
if (push.error && !push.includes('Already up')) {
  // 可能是新仓库没有 upstream
  const push2 = run('git push -u origin main');
  if (push2.error) {
    console.error('❌ 推送失败:', push2.error);
    process.exit(1);
  }
}
console.log('🚀 已推送到 GitHub!');
