# Slot Matrix Dock Chrome Extension

Floating toolbar companion for the Slot Matrix tool.

## Install locally

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select this folder:

```text
/Users/fe-trungnhan/ProjectNew/tool-cheat-react/extension
```

## Where it runs

The dock is injected on:

```text
https://cheat.staging.enostd.gay/*
https://iframe-tektale.staging.enostd.gay/*
https://cheat.doithe47.com/*
http://localhost/*
http://127.0.0.1/*
```

Chrome will not inject it into protected pages such as `chrome://...`.

## Configure payload

Right click the extension icon, choose `Options`, then edit:

- endpoint
- serviceId
- userId
- currency
- matrixData
- tableFormat
- powerUpSymbolCode
- bearerToken

The send button posts `application/x-www-form-urlencoded` data through the extension background worker.

## Move the dock

- Drag the dotted grip to move the dock.
- Position is saved in Chrome local storage and reused on matching sites.
- Click the pin button to toggle pinned/unpinned visual state.
- Double-click the pin button to reset the dock back to bottom center.
- Click the rotate button to switch between vertical and horizontal dock layout.
- The Forms list opens to the right when the dock is on the left half of the viewport, and to the left when the dock is on the right half.

## Dock controls

- `X`: collapse / expand the dock.
- Trash: POST form data to `/{serviceId}/clearsession?userId={userId}&currency={currency}` on the configured endpoint origin.
- Send: submit the current form-data payload.
- List: open loaded Forms and select one.
- `XS/SM/MD/LG`: cycle dock size.
- Rotate: switch the dock between vertical and horizontal layout.
- Pin: pin / unpin the dock visual state.
- Status badge shows whether the last send succeeded or failed.
