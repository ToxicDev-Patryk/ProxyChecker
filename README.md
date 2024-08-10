# ProxyChecker
Simple Proxy Checker made in Node.js with implemented MultiThreading and Support for Socks4/Socks5/Http Proxies!

## Features

- Multi-Protocol Support: The proxy checker supports various proxy types, including SOCKS4, SOCKS5, HTTP, and HTTPS, ensuring comprehensive testing capabilities.
- Random User-Agent Selection: Each request uses a random user-agent from the random-useragent library, enhancing anonymity and reducing the chance of detection.
- Multiple Host Testing: Proxies are tested against multiple hosts specified in the configuration file, providing a more robust assessment of proxy functionality.
- Timeout Handling: The checker includes a timeout mechanism to ensure that proxies are tested within a specified time limit, improving efficiency and preventing long waits.
- Graceful Shutdown: If the program is interrupted (e.g., by pressing CTRL + C), it gracefully shuts down.
- Threaded Execution: The checker uses worker threads to handle multiple proxies simultaneously, speeding up the testing process.
- SOCKS Proxy Verification: For SOCKS4 and SOCKS5 proxies, the checker verifies the proxy type by performing a handshake, ensuring that the proxy is indeed a SOCKS proxy and not an HTTP/HTTPS proxy.
- Configurable Settings: The checker reads settings from a configuration file, allowing users to customize parameters such as the number of threads, proxy type, input/output files, timeout, and hosts.
