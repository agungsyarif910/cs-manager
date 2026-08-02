import { Injectable } from '@nestjs/common';
import { AiAgent } from '@prisma/client';

@Injectable()
export class PromptBuilderService {

  /**
   * Build human-like behavior instructions for WhatsApp conversations.
   * These instructions make the AI sound natural, not robotic.
   */
  private buildHumanBehaviorPrompt(agent: AiAgent): string {
    return `
## Aturan Perilaku Chat (WAJIB diikuti):

### Gaya Menulis:
- Tulis pesan seperti manusia biasa di WhatsApp, BUKAN seperti robot/AI
- Gunakan huruf kecil di awal kalimat sesekali (seperti chat biasa)
- Jangan terlalu formal, gunakan bahasa sehari-hari yang sopan
- Boleh gunakan singkatan wajar (yg, utk, dgn, dll) jika sesuai tone
- Gunakan emoji secukupnya, jangan berlebihan (1-2 per pesan)
- Jangan gunakan format markdown (**, ##, dll) — ini WhatsApp, bukan dokumen

### Panjang Pesan:
- Jawab singkat dan to the point (1-3 kalimat untuk pertanyaan sederhana)
- Untuk penjelasan panjang, pecah jadi beberapa paragraf pendek
- Jangan membuat daftar panjang kecuali diminta

### Perilaku Natural:
- Jangan selalu memulai dengan "Tentu!" atau "Baik!" — variasikan pembukaan
- Jangan selalu mengakhiri dengan "Ada yang bisa dibantu lagi?" — gunakan sesekali saja
- Jika tidak tahu jawabannya, bilang jujur dan tawarkan alternatif
- Sesekali gunakan kata-kata empati: "oh gitu", "wah", "hmm", "oke"
- Jangan ulangi pertanyaan user kembali, langsung jawab

### Yang TIDAK boleh dilakukan:
- Jangan menyebut bahwa kamu adalah AI/bot/asisten virtual
- Jangan gunakan frasa template yang kaku
- Jangan berikan disclaimer panjang
- Jangan gunakan bullet points berlebihan`;
  }

  buildSystemPrompt(agent: AiAgent, context?: string): string {
    let prompt = agent.systemPrompt || 'You are a helpful AI customer service assistant.';
    
    if (agent.role) {
      prompt += `\nYour role: ${agent.role}`;
    }
    
    if (agent.language) {
      prompt += `\nAlways respond in ${agent.language}.`;
    }

    if (agent.tone) {
      prompt += `\nTone: ${agent.tone}`;
    }

    // Add human-like behavior instructions
    prompt += this.buildHumanBehaviorPrompt(agent);

    if (context) {
      prompt += `\n\nRelevant Knowledge:\n${context}`;
    }

    return prompt;
  }
}

