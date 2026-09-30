const MM_EN_DICTIONARY: Record<string, string> = {
  'အသက်': 'age',
  'နှစ်အရွယ်': 'year-old',
  'နှစ်': 'years old',
  'မြန်မာအမျိုးသား': 'Myanmar man',
  'မြန်မာအမျိုးသမီး': 'Myanmar woman',
  'အမျိုးသား': 'man',
  'အမျိုးသမီး': 'woman',
  'လူငယ်': 'young person',
  'ကောင်လေး': 'young boy',
  'ကောင်မလေး': 'young girl',
  'ဆံပင်အနက်ရောင်': 'black hair',
  'ဆံပင်': 'hair',
  'အနက်ရောင်': 'black',
  'အဖြူရောင်': 'white',
  'အပြာရောင်': 'blue',
  'အနီရောင်': 'red',
  'အဝါရောင်': 'yellow',
  'အစိမ်းရောင်': 'green',
  'အညိုရောင်': 'brown',
  'ရွှေရောင်': 'golden',
  'ငွေရောင်': 'silver',
  'တိုတို': 'short',
  'ရှည်ရှည်': 'long',
  'ကောက်ကောက်': 'curly',
  'ဖြောင့်ဖြောင့်': 'straight',
  'အသားညိုညို': 'warm brown skin',
  'အသားဖြူဖြူ': 'fair skin',
  'အသားလတ်လတ်': 'medium skin tone',
  'ကိုယ်လုံးသွယ်သွယ်': 'slim build',
  'ကိုယ်လုံးထွားထွား': 'sturdy build',
  'ဝဝကစ်ကစ်': 'chubby build',
  'တီရှပ်': 'T-shirt',
  'ရှပ်အကျီ': 'shirt',
  'ဂျင်းဘောင်းဘီ': 'blue jeans',
  'ဘောင်းဘီ': 'pants',
  'ဝတ်ထားသည်': 'wearing',
  'ဝတ်ဆင်ထားသည်': 'dressed in',
  'မျက်မှန်': 'glasses',
  'ဦးထုပ်': 'hat',
};

export async function translateDescriptionToEnglish(text: string, apiKey?: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return '';

  const hasMyanmar = /[\u1000-\u109F]/.test(trimmed);
  if (!hasMyanmar) {
    return trimmed;
  }

  try {
    const res = await fetch('/api/translate-description', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'x-gemini-api-key': apiKey.trim() } : {}),
      },
      body: JSON.stringify({ description: trimmed }),
    });
    const data = await res.json();
    if (data.success && data.translated) {
      return data.translated;
    }
  } catch (e) {
    console.warn('API translation error, using fallback:', e);
  }

  let translatedStr = trimmed;
  const sortedKeys = Object.keys(MM_EN_DICTIONARY).sort((a, b) => b.length - a.length);
  for (const k of sortedKeys) {
    const regex = new RegExp(k, 'g');
    translatedStr = translatedStr.replace(regex, MM_EN_DICTIONARY[k]);
  }

  return translatedStr;
}
