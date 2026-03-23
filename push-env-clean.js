const { spawnSync, execSync } = require('child_process');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const lines = envFile.split('\n');

for (const line of lines) {
    if (line.trim() && !line.startsWith('#')) {
        let [key, ...valueParts] = line.split('=');
        let value = valueParts.join('=').trim();
        if (value) {
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            }
            value = value.replace(/\r/g, '');
            value = value.replace(/\\n/g, '\n');

            console.log(`Adding ${key}...`);
            try {
                try { execSync(`npx vercel env rm ${key} production -y`, { stdio: 'ignore' }); } catch(e) {}
                
                const child = spawnSync('npx.cmd', ['vercel', 'env', 'add', key, 'production'], {
                    input: value,
                    encoding: 'utf-8',
                    shell: true
                });
                
                if (child.status === 0) {
                    console.log(`Successfully added ${key}`);
                } else {
                    console.error(`Status non-zero adding ${key}:`, child.stderr || child.stdout || child.error);
                }
            } catch (err) {
                console.error(`Failed to execute adding ${key}:`, err.message);
            }
        }
    }
}
