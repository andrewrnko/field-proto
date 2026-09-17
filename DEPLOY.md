# Shipping it

`npm run build` emits a fully static `dist/` with a relative base, so it runs from
any path — a Pages project URL, a subfolder, or a home-screen shortcut.

The build includes a web app manifest and an apple-touch-icon, so **Add to Home
Screen** on iOS gives it the Got Rot mark and opens it full screen with no
browser chrome. Safe areas are already handled.

Everything is fixtures. Nothing here reaches a customer.
