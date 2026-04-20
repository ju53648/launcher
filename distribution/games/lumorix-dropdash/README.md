# Lumorix DropDash

Lumorix DropDash is a tiny local HTML game used to test the Lumorix Launcher install, launch, uninstall, and future update flows.

## Package Contents

```text
lumorix-dropdash/
  index.html
  styles.css
  script.js
  README.md
```

## Launcher Start Target

The installed launcher target is:

```text
bin\launch.cmd
```

The launch script opens:

```text
index.html
```

The launcher should set the game install folder as the working directory. The command file resolves the HTML file relative to itself, so it stays stable if the library folder changes.

## Local Run

Open `index.html` directly in a browser. No server or backend is required.

Controls:

- `A` / `Left`: move left
- `D` / `Right`: move right
- `Space`: pulse shield
- `P`: pause

High score is stored in browser `localStorage`.

## Integration Notes

For local launcher testing, this game uses the launcher's `synthetic` install strategy. The manifest writes the game files into the selected Lumorix library and creates `bin\launch.cmd`. Uninstall removes the installed game folder through the normal launcher uninstall path.
