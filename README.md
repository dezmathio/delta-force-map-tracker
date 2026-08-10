# Delta Force Map Rotation Tracker

Real-time map rotation tracker for Delta Force Hazard Operations. View current and upcoming operation schedules in your local timezone.

## Features

- 🎯 **Live Timeline View** - Visual 24-hour calendar with color-coded maps
- 🔐 **Daily Password Codes** - Today's password-room codes per map (auto-updated)
- ⏰ **Local Timezone** - Automatically shows times in your timezone
- 🔴 **Current Time Indicator** - Red line shows exactly where you are now
- 🎨 **Map-Specific Colors** - Easy-to-distinguish color coding for each map
- 📅 **Weekday/Weekend Rotations** - Automatic detection and scheduling
- 🔄 **Auto-Updates** - Refreshes every minute to stay current

## Maps Tracked

- **Zero Dam** (Easy, Normal)
- **Layali Grove** (Easy, Solo)
- **Brakkesh** (Normal)
- **Space City** (Normal, Hard)
- **Tide Prison** (Normal, Hard)
- **AZ3** (Easy, Normal) — Season 10 Meltdown

## How It Works

The tracker uses a simple JSON structure to define map rotations:
- `always_available` - Maps available 24/7
- `weekday_rotation` - Monday through Sunday base schedule
- `weekend_additions` - Extra maps for Friday-Sunday

## Daily Password Codes

`room-codes.json` is refreshed by GitHub Actions (`.github/workflows/update-room-codes.yml`). The workflow signs requests with a key stored in repository secrets — nothing sensitive is committed.

### Repository secrets

In GitHub: **Settings → Secrets and variables → Actions → New repository secret**

| Name | Required | Value |
|---|---|---|
| `DF_ROOM_APPKEY` | **Yes** | Signing appkey used by the official HQ Daily Password client |
| `DF_ROOM_APP_ID` | No | Defaults to `10005` if unset |
| `DF_ROOM_API_BASE` | No | Defaults to `https://sg-act.playerinfinite.com` if unset |

After adding `DF_ROOM_APPKEY`, run **Actions → Update room codes → Run workflow** once to verify.

Local smoke test:

```bash
DF_ROOM_APPKEY='your-appkey-here' python3 scripts/fetch_room_codes.py
```

## Updating Schedules

When new rotation schedules are announced:

1. Open `rotation.json`
2. Update the `weekday_rotation` or `weekend_additions` arrays
3. Each entry needs: `hour`, `map`, `variant`, `confidence`
4. Commit and push - GitHub Pages will auto-deploy!

Example:
```json
{"hour": 20, "map": "Zero Dam", "variant": "Solo", "confidence": "official"}
```

## Local Development

```bash
# Serve locally
python3 -m http.server 3002
# or
npx http-server -p 3002
```

Then open `http://localhost:3002/`

## Support

If you find this tool useful, consider supporting development:
[Buy me a coffee ☕](https://buymeacoffee.com/dezmathio)

## Built With

- Vanilla JavaScript
- [Luxon](https://moment.github.io/luxon/) - Timezone handling
- CSS Grid & Flexbox

## License

MIT License - Feel free to fork and customize!

---

Built as a community utility for Delta Force players 🎮
