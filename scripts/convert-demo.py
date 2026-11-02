"""Optional: pip install -r requirements-video.txt, then run this script."""
import subprocess
from pathlib import Path

import imageio_ffmpeg

root = Path(__file__).resolve().parents[1]
subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-hide_banner", "-loglevel", "error",
    "-i", str(root / "artifacts/gatorgo-demo.webm"), "-t", "60", "-c:v", "libx264", "-crf", "22",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", str(root / "artifacts/gatorgo-demo.mp4")], check=True)
reader = imageio_ffmpeg.read_frames(str(root / "artifacts/gatorgo-demo.mp4"), pix_fmt="rgb24")
metadata = next(reader)
reader.close()
print({key: metadata[key] for key in ("codec", "duration", "size", "fps")})
if metadata["duration"] > 60.1 or metadata["codec"] != "h264":
    raise SystemExit("Video verification failed")
