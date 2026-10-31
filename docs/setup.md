# Setting it up

From nothing to asking Claude about your Revolut Business account, in about
fifteen minutes. You need Node.js 24 or later, `openssl` (already on macOS and
Linux) and a Revolut Business account. Start in the **sandbox**: it has fake
money and cannot hurt anything. Revolut's own labels change now and then, so
treat [their API guide](https://developer.revolut.com/docs/guides/manage-accounts/get-started/make-your-first-api-request)
as the authority on where a button lives.

## 1. Create a key pair

Revolut identifies your app by a certificate you upload, and you prove who you
are by signing a short token with the matching private key.

```bash
openssl genrsa -out privatekey.pem 2048
openssl req -new -x509 -key privatekey.pem -out publickey.cer -days 1825
```

Keep `privatekey.pem` private: anyone who has it can act as your app. This server
never sees it, and you should not paste it into a chat or commit it.

## 2. Add the certificate and get a client ID

1. Sign in to the Revolut Business web app. For the sandbox use
   [sandbox-business.revolut.com](https://sandbox-business.revolut.com/).
2. Go to **Settings → APIs → Business API** and add an **API certificate**.
3. Upload `publickey.cer`, and set an **OAuth redirect URI** you control, such as
   `https://example.com`. Nothing needs to be hosted there: you only read a code
   out of the address bar.
4. Save, then copy the **Client ID**.

## 3. Authorise the app and get an access token

1. In the same screen, enable API access and click **Authorise**, then approve
   the request. Revolut sends you to your redirect URI with `?code=...` on the
   end. Copy the code; it is single-use and short-lived.
2. Sign a client assertion with your private key (RS256). Its claims are
   `iss` = your redirect URI's domain (no `https://`), `sub` = your client ID,
   `aud` = `https://revolut.com`, and an `exp` a few minutes ahead. Revolut's
   guide has a ready-made script.
3. Exchange the code for tokens (use `https://b2b.revolut.com` for production):

   ```bash
   curl -s https://sandbox-b2b.revolut.com/api/1.0/auth/token \
     -d grant_type=authorization_code \
     -d code="$CODE" \
     -d client_id="$CLIENT_ID" \
     -d client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer \
     -d client_assertion="$JWT"
   ```

4. The reply holds an `access_token` and a `refresh_token`. **Access tokens last
   40 minutes.** This server uses the access token you give it and does not
   refresh it: when it expires, get a new one with `grant_type=refresh_token`
   and restart the server (the refresh token itself stays put, so keep it
   safe too).

## 4. Add it to your AI app

The steps below are for Claude. For Codex CLI, Cursor, VS Code, Windsurf or Gemini
CLI, use the snippet for your app in
[configuration.md](configuration.md#mcp-clients) instead: same command, same
variables. (ChatGPT and Grok can't use it yet:
[why](configuration.md#chatgpt-and-grok).)

- **Claude Desktop and Cowork:** edit `claude_desktop_config.json` (on macOS in
  `~/Library/Application Support/Claude/`).
- **Claude Code:** edit `.mcp.json` in your project, or run
  `claude mcp add revolut -e REVOLUT_ACCESS_TOKEN=... -- npx -y revolut-mcp`.

```json
{
  "mcpServers": {
    "revolut": {
      "command": "npx",
      "args": ["-y", "revolut-mcp"],
      "env": {
        "REVOLUT_ACCESS_TOKEN": "your_access_token"
      }
    }
  }
}
```

Restart the app. With no `REVOLUT_BASE_URL` the server talks to the **sandbox**.

## 5. Check it works

Ask "List my Revolut accounts". In the sandbox you can add fake money with
`revolut_simulate_topup`, which is a good way to try everything else.

Payments, transfers, exchanges, new payees, card changes and webhooks are **not
there yet**: they are off by default. When you are ready, read
[security.md](security.md#sensitive-tools), then add
`"REVOLUT_ENABLE_SENSITIVE_TOOLS": "true"` to `env`. Keep that to the sandbox
until you trust the setup. To go live, use a production token and add
`"REVOLUT_BASE_URL": "https://b2b.revolut.com"`; a sandbox token does not work
there and the other way round.
