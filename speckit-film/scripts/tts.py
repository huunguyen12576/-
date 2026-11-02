import json, base64, sys, os, urllib.request, wave
here=os.path.dirname(os.path.abspath(__file__))
lines=json.load(open(os.path.join(here,'vo_lines.json'),encoding='utf-8'))
model=sys.argv[1]; out=sys.argv[2]; key=os.environ['GEMINI_API_KEY']
style="Giọng nam trầm ấm, kể chuyện điện ảnh, nghỉ rõ giữa các câu. Đọc nguyên văn đoạn sau:\n\n"
text=style+"\n".join(lines)
body={"contents":[{"parts":[{"text":text}]}],"generationConfig":{"responseModalities":["AUDIO"],"speechConfig":{"voiceConfig":{"prebuiltVoiceConfig":{"voiceName":"Charon"}}}}}
req=urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",data=json.dumps(body).encode(),headers={"x-goog-api-key":key,"Content-Type":"application/json"})
r=json.load(urllib.request.urlopen(req,timeout=300))
part=r["candidates"][0]["content"]["parts"][0]["inlineData"]
pcm=base64.b64decode(part["data"]); print(part["mimeType"], len(pcm))
if pcm[:4]==b"RIFF":
    open(out,"wb").write(pcm); sys.exit(0)
w=wave.open(out,'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm); w.close()
