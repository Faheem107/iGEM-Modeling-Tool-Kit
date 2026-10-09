import sys, json, glob, os, subprocess, numpy as np
from faster_whisper import WhisperModel
m = WhisperModel("small.en", compute_type="int8")
out = sys.argv[2]
for f in sorted(glob.glob(sys.argv[1] + "/*.wav")):
    a = np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',f,'-f','s16le','-ac','1','-ar','16000','-'],capture_output=True).stdout,np.int16).astype(np.float32)/32768
    segs, _ = m.transcribe(a, word_timestamps=True)
    words = [dict(w=w.word, s=w.start, e=w.end) for sg in segs for w in sg.words]
    name = os.path.basename(f).split(".")[0]
    json.dump(words, open(f"{out}/{name}.json", "w"))
    print(name, " ".join(x["w"] for x in words)[:3000], "\n", flush=True)
