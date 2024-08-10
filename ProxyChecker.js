const fs = require('fs-extra');
const net = require('net');
const http = require('http');
const https = require('https');
const url = require('url');
const path = require('path');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const randomUseragent = require('random-useragent');

const configPath = path.join(__dirname, 'config.json');

const defaultConfig = {
    Threads: 1,
    ProxyType: 'SOCKS5',
    InputFile: 'proxies.txt',
    OutputFile: 'Checked_Proxies.txt',
    MaxTimeout: 1000,
    Hosts: ["example.com", "google.com", "github.com"]
};

if (!fs.existsSync(configPath)) {
    fs.writeJsonSync(configPath, defaultConfig, { spaces: 4 });
}

const config = fs.readJsonSync(configPath);

const validProxyTypes = ['socks4', 'socks5', 'http', 'https'];
if (!validProxyTypes.includes(config.ProxyType.toLowerCase())) {
    console.log('Invalid ProxyType in config. Must be one of: socks4, socks5, http, https');
    process.exit(1);
}

let validProxies = [];

function getRandomHost() {
    const hosts = config.Hosts;
    return hosts[Math.floor(Math.random() * hosts.length)];
}

async function checkProxy(proxy, proxyType, maxTimeout) {
    return new Promise((resolve) => {
        const [host, port] = proxy.split(':');

        if (proxyType === 'socks4' || proxyType === 'socks5') {
            const socket = net.createConnection({ host, port, timeout: maxTimeout }, () => {
                const handshake = proxyType === 'socks4' ? Buffer.from([0x04, 0x01, 0x00, 0x50, 0x00, 0x00, 0x00, 0x01, 0x00]) : Buffer.from([0x05, 0x01, 0x00]);
                socket.write(handshake);

                socket.once('data', (data) => {
                    if ((proxyType === 'socks4' && data[0] === 0x00 && data[1] === 0x5A) || (proxyType === 'socks5' && data[0] === 0x05)) {
                        socket.end();
                        resolve(true);
                    } else {
                        socket.destroy();
                        resolve(false);
                    }
                });
            });

            socket.on('error', () => resolve(false));
            socket.on('timeout', () => {
                socket.destroy();
                resolve(false);
            });
        } else {
            const targetHost = getRandomHost();
            const options = {
                host,
                port,
                method: 'GET',
                timeout: maxTimeout,
                path: '/',
                headers: {
                    'User-Agent': randomUseragent.getRandom(),
                    'Host': targetHost
                }
            };

            let agent;
            if (proxyType === 'http' || proxyType === 'https') {
                agent = new SocksProxyAgent(`${proxyType}://${proxy}`);
            }

            const request = (proxyType === 'https' ? https : http).request({ ...options, agent }, (res) => {
                resolve(res.statusCode === 200);
            });

            request.on('error', () => resolve(false));
            request.end();
        }
    });
}

async function checkProxyWithTimeout(proxy, proxyType, maxTimeout) {
    return Promise.race([
        checkProxy(proxy, proxyType, maxTimeout),
        new Promise((resolve) => setTimeout(() => resolve(false), maxTimeout))
    ]);
}

async function workerFunction({ proxies, proxyType, maxTimeout }) {
    const results = [];
    for (const proxy of proxies) {
        const isValid = await checkProxyWithTimeout(proxy, proxyType, maxTimeout);
        if (isValid) {
            console.log(`\x1b[32m[+] ${proxy}\x1b[0m`); 
            results.push(proxy);
        } else {
            console.log(`\x1b[31m[-] ${proxy}\x1b[0m`); 
        }
    }
    parentPort.postMessage(results);
}

if (isMainThread) {
    async function main() {
        const proxies = fs.readFileSync(config.InputFile, 'utf-8').split('\n').filter(Boolean);
        const chunkSize = Math.ceil(proxies.length / config.Threads);
        const threads = [];

        for (let i = 0; i < config.Threads; i++) {
            const chunk = proxies.slice(i * chunkSize, (i + 1) * chunkSize);
            threads.push(new Promise((resolve, reject) => {
                const worker = new Worker(__filename, {
                    workerData: { proxies: chunk, proxyType: config.ProxyType, maxTimeout: config.MaxTimeout }
                });
                worker.on('message', (message) => {
                    validProxies = validProxies.concat(message);
                    resolve();
                });
                worker.on('error', reject);
                worker.on('exit', (code) => {
                    if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
                });
            }));
        }

        await Promise.all(threads);
        fs.writeFileSync(config.OutputFile, validProxies.join('\n'), 'utf-8');
        console.log(`Checked proxies saved to ${config.OutputFile}`);
    }

    process.on('SIGINT', () => {
        console.log('\nGracefully shutting down...');
        console.log(`Checked proxies didn't save!`);
        process.exit();
    });

    main();
} else {
    workerFunction(workerData);
}
