# Steam native boundary

Pinned Steamworks SDK: 1.65, official downloaded ZIP SHA-256
`8c42792e09100988e31e3dc069de2eb1bc60702a0445bb37298ba0c54067c202`.
SDK headers and redistributables are supplied externally, never committed.
The Node-API addon runs only in Electron main. Renderer calls are validated
by the JS facade. Build each OS/architecture natively; do not cross-label binaries.
