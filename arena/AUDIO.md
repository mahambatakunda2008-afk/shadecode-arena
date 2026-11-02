# Tile Rush audio

Tile Rush now has local audio feedback without remote media requests.

## What is implemented

- Three short, synthesized WAV effects: tile selection, accepted move, and rejected move.
- An optional ambient music loop, disabled by default.
- Separate sound-effects and music preferences, persisted with the player's local progress.
- Audio files are synthesized on first entry to Tile Rush and written to the app cache. They are recreated if the operating system clears that cache.
- Playback uses Expo Audio. Audio mode mixes with other apps and permits playback while the device is in silent mode.
- No microphone permission, recording, remote audio stream, analytics or third-party audio service is used.

## Device validation still required

CI verifies Expo dependency compatibility, native Android/iOS bundle exports and TypeScript. It cannot verify speaker output, headphone routing, interruption behavior or subjective sound quality. Those need a physical Android and iOS device before release.

Music is intentionally low-volume and opt-in. Ranked competition audio timing is not authoritative and is not used for scoring.

## Future: original character voice pack (planned, not implemented)

Voice acting is a later polish milestone. The game should be able to use short, optional original voice lines for events such as:
- a standard match or a clean special activation;
- a large combo or multi-wave cascade;
- a personal-best or achievement unlock;
- daily challenge completion;
- a playful near-miss or retry prompt.

Design requirements before recording:
- Use original commissioned or properly licensed performances. Do not imitate a real person, celebrity, or a recognisable game character.
- Keep lines short, infrequent and context-aware. Never speak over every move.
- Provide independent voice-volume and voice mute controls, separate from effects and music.
- Bundle a small compressed voice pack for offline playback; no streaming or microphone permission should be required.
- Include captions/text equivalents for every gameplay-critical spoken cue. Voice must never be the only way to receive information.
- Avoid interrupting screen readers, calls, navigation audio or other accessibility services. Test audio focus and interruption behaviour on physical devices.
- Plan for multiple voice styles and language packs only after the core gameplay and audio controls are stable.

No voice recordings or voice-generation dependency are included in the current build.

