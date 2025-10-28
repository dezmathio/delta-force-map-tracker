# Delta Force Map Rotation Tracker

Real-time map rotation tracker for Delta Force Hazard Operations. View current and upcoming operation schedules in your local timezone.

## Features

- 🎯 **Live Timeline View** - Visual 24-hour calendar with color-coded maps
- ⏰ **Local Timezone** - Automatically shows times in your timezone
- 🔴 **Current Time Indicator** - Red line shows exactly where you are now
- 🎨 **Map-Specific Colors** - Easy-to-distinguish color coding for each map
- 📅 **Weekday/Weekend Rotations** - Automatic detection and scheduling
- 🔄 **Auto-Updates** - Refreshes every minute to stay current

## Maps Tracked

- **Zero Dam** (Easy, Normal, Solo, Night)
- **Layali Grove** (Easy, Normal)
- **Brakkesh** (Normal)
- **Space City** (Normal, Hard)
- **Tide Prison** (Hard)

## How It Works

The tracker uses a simple JSON structure to define map rotations:
- `always_available` - Maps available 24/7
- `weekday_rotation` - Monday through Sunday base schedule
- `weekend_additions` - Extra maps for Friday-Sunday

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
