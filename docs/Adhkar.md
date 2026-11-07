# Tools and Masjidi adhkar

Source: https://athkari.masjidi.app/ (the official public Adhkari frontend), retrieved 2026-11-07. The source asset and SHA-256 digests are recorded in Adhkar-Source.json. Only its public Quran/prayer text data, counts and scripture labels were extracted using a static literal parser. No remote JavaScript was executed or copied into Siraj's UI implementation.

The snapshot contains 146 entries: morning 19, evening 20, bedtime 10, post-prayer base 11, Fajr additions 2, Maghrib addition 1, six ruqyah groups totalling 33, comprehensive dua 50. Prayer views reproduce the source's composition: 13 Fajr, 11 Dhuhr, 11 Asr, 12 Maghrib, 11 Isha. Six open-counter phrases are also retained from the source's literal map. Original text, labels and repetition values are preserved without adding claims about authenticity or healing.

The available public source has no separate "أدعية الأحوال" section. The interface states this limitation explicitly. Adding it requires the actual source material rather than silently substituting another collection.

Tools replaces the standalone Quran menu across mosque staff, student and platform roles. Old assistant Quran actions still open the existing reader. All tools are read-only with respect to educational records. Adhkar counter progress is local to the current account and Beirut date, with guarded storage hydration and no grading, notification or database writes.

Validation: tests/adhkar-source.mjs checks the pinned data digest, every section count, record IDs, repetition values and the full five-prayer compositions. Production build and React hook ordering checks pass.
