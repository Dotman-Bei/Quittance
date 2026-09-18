# Demo video

**https://youtu.be/F8fvQNC44wE**

| | |
|---|---|
| Title | `quittance demo` |
| Channel | Emmanuel Bamigboye |
| Recorded | 2026-09-18 |
| Archival copy | `evidence/quittance_demo.mp4`, 17,579,957 bytes, tracked in git |
| Measured | 1920×1080, 24 fps, h264 + aac, **298 s (4m58s)** — read from the file with `ffprobe`, not from the description |
| Hosted copy verified | YouTube oEmbed returns 200 with title and author, which it does not do for a private or deleted video |

> The README first described this as 2m45s. It is 4m58s. The number now comes from the file.

## What `submission:check` does and does not verify

It verifies that a demo video URL is **recorded here**. It does not watch the video, and it cannot
confirm that the content below is what the video shows. That part is the owner's attestation, and it
is written down here rather than left implied so a judge knows exactly which parts are machine-checked.

Every other row of G9 is checked against an artifact. This one is not, and saying so is cheaper than
having a judge discover it.

## §23 script

The video shows the working build, not slides, and shows the failure before the success.

1. A live listed endpoint returns 402. The advertised terms are read on screen from its own response.
2. A gated call succeeds. The receipt appears. The KeeperHub run and the explorer tx are both opened.
3. A second call to an endpoint that does not deliver. The verdict is `NOT_DELIVERED`, no discharge
   tx exists, and the endpoint's delivery record updates in front of the viewer.
4. The receipt is verified from a second terminal with `quittance verify`, with no login.
5. The limitations are read aloud, including the trusted-observer boundary and the purchase leg.

## Driving it yourself

Every step is runnable from a cold start — see [TESTING.md](../TESTING.md). Nothing in the video
depends on a warmed cache or a rehearsed state.
