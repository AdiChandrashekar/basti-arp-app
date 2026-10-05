// Publishes dist/ to the gh-pages branch, which GitHub Pages serves.
// Run with `npm run deploy` after committing. The data is read live from the
// dashboard's site, so this is only needed when the app's own code changes.
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const run = (cmd, cwd = '.') => execSync(cmd, { cwd, stdio: 'inherit' })
const remote = execSync('git remote get-url origin').toString().trim()
const commit = execSync('git rev-parse --short HEAD').toString().trim()

writeFileSync('dist/.nojekyll', '')
run('git init -q -b gh-pages', 'dist')
run('git add -A', 'dist')
run(`git -c user.name="Aditya Chandrashekar" -c user.email="adichandrashekar36@gmail.com" commit -q -m "Deploy ${commit}"`, 'dist')
run(`git push -f -q ${remote} gh-pages`, 'dist')
console.log(`Deployed ${commit} to gh-pages`)
