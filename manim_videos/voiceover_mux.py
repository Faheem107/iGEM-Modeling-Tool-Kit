import json, re, difflib, sys, subprocess, glob, os
TX, OUT = sys.argv[1], sys.argv[2]
ROOT="/Users/an859/Desktop/igem modeling/iGEM-Modeling-Tool-Kit/"
V=ROOT+"public/videos/"
M={"1":"fba","2":"caco3","4":"protein-3d","5":"metabolic","6":"crosslink","7":"ca-anchoring","9":"thermal","10":"ecological","11":"aeolian","12":"wetlab"}
ids=sys.argv[3:] or list(M)
norm=lambda t:[w for w in re.sub(r"[^a-z0-9 ]"," ",t.lower().replace("-"," ")).split() if w]
def ts(s):
    h,m,x=s.split(":"); return int(h)*3600+int(m)*60+float(x)
def fmt(t):
    h=int(t//3600); m=int(t%3600//60); return f"{h:02d}:{m:02d}:{t%60:06.3f}"
def dur(f): return float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f]))
for k in ids:
    v=M[k]
    wav=glob.glob(ROOT+f"Voiceover/{k}. *.wav")[0]
    rec=json.load(open(f"{TX}/{k}.json"))
    cut=0.0
    if v=="thermal":  # the opening sentence was recorded twice; keep the second take
        i=[j for j,w in enumerate(rec) if w["w"].strip()=="An"][1]
        cut=rec[i]["s"]-0.25; rec=[dict(w=w["w"],s=w["s"]-cut,e=w["e"]-cut) for w in rec[i:]]
    # expand recording words into normalized tokens, each with its time
    at=[]
    for w in rec:
        for t in norm(w["w"]): at.append((t,w["s"],w["e"]))
    cues=[]
    for blk in open(V+v+".en.vtt").read().strip().split("\n\n")[1:]:
        ln=blk.split("\n"); a,b=ln[1].split(" --> ")
        cues.append(dict(s=ts(a),e=ts(b),text="\n".join(ln[2:])))
    bt=[]; owner=[]
    for ci,c in enumerate(cues):
        for t in norm(c["text"]): bt.append(t); owner.append(ci)
    sm=difflib.SequenceMatcher(None,[x[0] for x in at],bt,autojunk=False)
    hit={}
    for blk in sm.get_matching_blocks():
        for n in range(blk.size): hit[blk.b+n]=blk.a+n
    for ci,c in enumerate(cues):
        idx=[hit[j] for j in range(len(bt)) if owner[j]==ci and j in hit]
        c["rs"]=at[min(idx)][1] if idx else None; c["re"]=at[max(idx)][2] if idx else None
    # keep only monotonic anchored cues
    last=-1
    for c in cues:
        if c["rs"] is None or c["rs"]<=last: c["rs"]=None
        else: last=c["rs"]
    vd=dur(V+v+".mp4"); ad=dur(wav)-cut
    anch=[(0.0,0.0)]
    for c in cues:
        if c["rs"] is not None and c["s"]>anch[-1][0]+0.05 and c["rs"]>anch[-1][1]+0.05: anch.append((c["s"],c["rs"]))
    tail=max(vd-cues[-1]["e"],0.8)
    lastw=rec[-1]["e"]
    anch.append((vd, max(lastw+tail, anch[-1][1]+0.5)))
    total=anch[-1][1]
    # video: piecewise retime
    parts=[];fc=[]
    for n,((v0,a0),(v1,a1)) in enumerate(zip(anch,anch[1:])):
        f=(a1-a0)/(v1-v0)
        fc.append(f"[0:v]trim=start={v0:.4f}:end={v1:.4f},setpts=(PTS-STARTPTS)*{f:.5f}[v{n}]"); parts.append(f"[v{n}]")
    fc.append("".join(parts)+f"concat=n={len(parts)}:v=1:a=0,fps=30[vo]")
    fc.append(f"[1:a]atrim=start={cut:.3f},asetpts=PTS-STARTPTS,loudnorm=I=-16:TP=-1.5,aresample=48000,apad=whole_dur={total:.3f}[ao]")
    out=f"{OUT}/{v}.mp4"
    subprocess.run(["ffmpeg","-y","-v","error","-i",V+v+".mp4","-i",wav,"-filter_complex",";".join(fc),
        "-map","[vo]","-map","[ao]","-c:v","libx264","-crf","26","-preset","slow","-pix_fmt","yuv420p",
        "-c:a","aac","-b:a","96k","-ac","1","-t",f"{total:.3f}","-movflags","+faststart",out],check=True)
    # subtitles on the recording's clock
    vt=["WEBVTT",""]; n=0
    for i,c in enumerate(cues):
        if c["rs"] is None:  # map unanchored cue through the video->audio timeline
            def mp(t):
                for (v0,a0),(v1,a1) in zip(anch,anch[1:]):
                    if v0<=t<=v1: return a0+(t-v0)*(a1-a0)/(v1-v0)
                return t
            s,e=mp(c["s"]),mp(c["e"])
        else: s,e=c["rs"],c["re"]
        nxt=[x["rs"] for x in cues[i+1:] if x["rs"] is not None]
        e=max(e,s+0.6)+0.1
        if nxt: e=min(e,nxt[0]-0.1)
        n+=1; vt+= [str(n),f"{fmt(max(s-0.05,0))} --> {fmt(e)}",c["text"],""]
    open(f"{OUT}/{v}.en.vtt","w").write("\n".join(vt))
    un=sum(c["rs"] is None for c in cues)
    print(v, f"video {vd:.1f}->{total:.1f}s", "factors", ",".join(f"{(a1-a0)/(v1-v0):.2f}" for (v0,a0),(v1,a1) in zip(anch,anch[1:])), f"unanchored {un}/{len(cues)}", os.path.getsize(out)//1024,"KB", flush=True)
