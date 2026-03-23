const { execSync } = require('child_process');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const lines = envFile.split('\n');

for (const line of lines) {
    if (line.trim() && !line.startsWith('#')) {
        let [key, ...valueParts] = line.split('=');
        let value = valueParts.join('=');
        if (value) {
            // Remove aspas caso tenha
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            }
            // Substitui \n literais para que o bash/cmd os gere se necessário, mas no json é literal string
            // O CLI do Vercel add env var interativo. Vou tentar usar child_process exec e stdin
            
            console.log(`Adding ${key}...`);
            try {
                // Remove existing
                try { execSync(`npx vercel env rm ${key} production -y`, { stdio: 'ignore' }); } catch(e) {}
                
                // Add new via pipe
                execSync(`echo "${value}" | npx vercel env add ${key} production`, { stdio: 'inherit', shell: 'cmd.exe' });
            } catch (err) {
                console.error(`Failed to add ${key}:`, err.message);
            }
        }
    }
}
