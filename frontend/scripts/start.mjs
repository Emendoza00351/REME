/**
 * Envoltorio de "serve -s dist" que lee PORT en runtime de forma
 * cross-platform. "${PORT:-3000}" directo en package.json funciona en
 * Railway/Linux (npm lo corre via sh) pero no en Windows (npm usa cmd.exe,
 * que no expande esa sintaxis) — con un script de Node no importa qué shell
 * lo invoque.
 */
import { spawn } from 'node:child_process';

const port = Number(process.env.PORT) || 3000;
// Sin shell, spawn('serve', ...) no encuentra el shim .cmd de Windows
// (ENOENT) aunque node_modules/.bin esté en el PATH. Con shell:true hay que
// pasar el comando como un solo string (no un array de args) — así Node no
// tiene que adivinar el escapado y no tira el warning de seguridad DEP0190.
const child = spawn(`serve -s dist -l ${port}`, { stdio: 'inherit', shell: true });
child.on('exit', (code) => process.exit(code ?? 0));
