# Changelog

Android versions are published on the [Releases](https://github.com/sunnyberd/Tasbih/releases) page.
The web app updates by itself; its cache version is noted in brackets.

## 0.27 — 2026-11-21 (web v170)

### Changed
- The app and the website are now built from a minified copy of the code: no comments or extra whitespace, about half the size, faster start on slower phones. Behaviour is unchanged.

## 0.26 — 2026-11-19 (web v168)

### Fixed
- Special dhikr folders are now included in backups and cloud sync; folders edited on two devices are merged instead of overwritten.
- Prayer calculation method is picked by the phone's time zone: Saudi Arabia, Kuwait, Qatar, UAE and Bahrain no longer get the Tehran method, Russia gets its own method.
- Fajr and Isha at high latitudes in summer (Moscow, Kazan, St Petersburg) — previously shown as `--:--`.
- Damaged data in storage or in a backup file no longer prevents the app from starting.
- Drag and drop of special dhikrs moves the right dhikr to the right place.
- Edits of a built‑in special dhikr are visible in all 15 languages.
- Floating counter taps are not lost if counting fails.
- Android: Azkar notifications pass through Do Not Disturb in dark dhikr mode.
- Android: reminders are scheduled 30 days ahead, with a reminder to open the app before they run out.

### Changed
- Repository reorganised: icons and screenshots in `assets/`, hadiths in `data/`, helper scripts in `js/`.
- The Android APK is published on GitHub Releases.

## 0.25 and earlier

- Long‑press the special dhikr ring to add or subtract a number (v166).
- New statistics: periods, cards, line / bar charts, share of each dhikr, custom period (v152–v165).
- Per‑prayer notifications with their own sounds and Abu Umamah's dua (v163).
- Dimming buttons and quick icons around the counter (v142–v147).
- Floating counter over other apps counts every tap (v148–v151).
- Dark dhikr mode: Do Not Disturb, click only in headphones, update check (v138–v139).
- Android app: notifications through Android alarms, Google sign‑in, themed system bars (v116–v125).
- Push notifications even when the app is closed (v115).
- Performance work: local fonts, lazy data, split translations and code (v103–v108).
- The 99 Names of Allah in all 15 languages (v109–v110).
