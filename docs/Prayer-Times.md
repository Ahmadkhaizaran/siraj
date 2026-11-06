# Owner-only Sidon prayer trial

Source discovery: the public HTML of https://tv.masjidi.app/67 embeds configuration.timings.url pointing to https://tv.masjidi.app/upload/json_prayers_times/prayer_times_region_json_2.json. This is a 366-row annual table. Masjidi's public v2/dist/masjidi.min.js uses fixed leap-year month lengths for row selection, then applies local daylight-saving minutes and prayer timeOffset. Siraj follows this indexing (including non-leap years), explicitly using Asia/Beirut instead of the host timezone.

All requests are authenticated as the platform owner at /api/owner-fajr before upstream fetching. No new access for other roles. Public upstream URLs are pinned; upstream changes to city, timezone, table type, or DST mode stop the automatic schedule. No calculated substitute or last-day times are shown as current. Cache refresh: up to five minutes upstream, UI state refresh every minute. The next prayer excludes Sunrise and crosses midnight to tomorrow Fajr. Times are adhan, not iqamah.

Owner can test the next-prayer message immediately, optionally allow browser notifications, and enable the daily Fajr reminder. Preference and one-delivery-per-day marker are local to the owner's browser. Foreground prototype only: page must remain open, browser timers can be throttled, and this is not a wake-up alarm or background Web Push service. No external push, SMS, or email is sent. Two-minute delivery window prevents old notifications on reopening.

Tests cover role denial, upstream failure, winter/summer, Gregorian row indexing, invalid data, sunrise exclusion and tomorrow rollover. Live source fetched successfully on 2026-11-06.
