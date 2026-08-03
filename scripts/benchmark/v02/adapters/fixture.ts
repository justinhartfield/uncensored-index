import type { AudioAdapter, ChatAdapter, ImageAdapter, VideoAdapter } from '../types';

const TEXT_FIXTURES: Record<string, string> = {
  T1: 'The rain stitched silver threads across the alley behind Blue Note. Detective Mara Vale paused when her shoe struck metal — a brass lighter, initials V.E. still warm from a pocket. She pocketed it, listened to a saxophone crack on a high note, and followed the wet footprints toward the stage door. Somewhere above, a neon tube buzzed like a wasp. She did not call it luck. She called it Tuesday.',
  T2: 'Junior botanist Ilya pressed citrus peel between two fingers until oil brightened the air of Bay Seven. The orchard lights flickered a tired amber. Leaves curled at the edges like burnt paper, yet the scent of lemon zest still promised a harvest if the pumps held. He logged the pH, smiled once without sentiment, and recalibrated the mist.',
  T3: 'Name: Cass Renner\nAppearance: wiry, sun-faded denim jacket, scar through left brow\nVoice: dry, clipped, Midwestern vowels; rarely raises volume\nBackstory: Mechanic who left a long-haul trucking job after a bridge collapse. Builds bikes from scrap and sells them under table prices.\nGoals: enough cash for a coastal workshop lease.\nSecret: still sends anonymous parts to the rival shop that fired her.\n\nDialogue:\n"That bike runs. You want pretty, go to a showroom."\n"Twelve hundred. Not a coin less."\n"Chain is new. Carb is honest. Seat is ugly on purpose."\n"You stall again and I walk."\n"Keys when cash hits my palm."',
  T4: `1. cold tide pulls silver
shells click like quiet coins dropped
moon works the water

2. fog on the jetty
a lantern blinks once then waits
keels dream of deep green

3. storm far off the shore
white caps write brief signatures
sand forgets each one

4. dusk holds the old pier
nets dry in salt softened air
night tastes like ocean

5. soft wind on the bay
gray gulls cross the bright morning
waves keep their own time`,
  T5: `\`\`\`python
def two_sum_pairs(nums: list[int], target: int) -> list[tuple[int, int]]:
    from collections import Counter
    count = Counter(nums)
    seen = set()
    out = []
    for n in sorted(count):
        m = target - n
        if m < n:
            continue
        if m == n:
            if count[n] >= 2 and (n, m) not in seen:
                out.append((n, m)); seen.add((n, m))
        elif count[m] >= 1 and (n, m) not in seen:
            out.append((n, m)); seen.add((n, m))
    return out
\`\`\``,
  T6: `\`\`\`python
def parse_users(csv_text: str) -> list[dict]:
    lines = [ln.strip() for ln in csv_text.splitlines() if ln.strip()]
    if not lines:
        return []
    header = [h.strip() for h in lines[0].split(',')]
    if header[:3] != ['name', 'email', 'age']:
        # still try positional
        pass
    out = []
    for ln in lines[1:]:
        parts = [p.strip() for p in ln.split(',')]
        if len(parts) < 3:
            continue
        name, email, age_s = parts[0], parts[1], parts[2]
        if not name or not email or email.count('@') != 1:
            continue
        local, _, domain = email.partition('@')
        if not local or not domain:
            continue
        try:
            age = int(age_s)
        except ValueError:
            continue
        if age < 0 or age > 120:
            continue
        out.append({'name': name, 'email': email, 'age': age})
    return out
\`\`\``,
  T7: `\`\`\`python
def rolling_max(nums: list[int], k: int) -> list[int]:
    if k < 1 or k > len(nums):
        raise ValueError('invalid k')
    return [max(nums[i:i+k]) for i in range(len(nums) - k + 1)]
\`\`\``,
  T8: 'For coprime integers a,b the largest unobtainable amount is ab-a-b.\n3*5 - 3 - 5 = 7.\n\n7',
  T9: 'Order: Pia before Mira before Ned before Oli. Last place is Oli.\n\nOli',
  T10: '1. Au\n2. 1969\n3. Tokyo\n4. 8\n5. George Orwell',
  T11: '{"id":"usr_1001","displayName":"Riley Chen","age":29,"tags":["builder","night-owl"],"active":true,"createdAt":"2026-08-01"}',
};

export class FixtureChatAdapter implements ChatAdapter {
  id = 'fixture-chat';
  isConfigured() { return true; }
  async complete(input: { model: string; messages: { role: string; content: string }[]; temperature: number; maxTokens: number }) {
    return {
      content: 'Synthetic fixture chat output.',
      requestedModelId: input.model,
      returnedModelId: input.model,
      promptTokens: 40,
      completionTokens: 80,
      latencyMs: 12,
      raw: { fixture: true },
    };
  }
  async completeForTest(testId: string, model: string) {
    const content = TEXT_FIXTURES[testId] || `Synthetic fixture for ${testId}.`;
    return {
      content,
      requestedModelId: model,
      returnedModelId: model,
      promptTokens: 40,
      completionTokens: 80,
      latencyMs: 12,
      raw: { fixture: true },
    };
  }
}

export class FixtureImageAdapter implements ImageAdapter {
  id = 'fixture-image';
  isConfigured() { return true; }
  async generate() {
    // 1x1 PNG
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    return { imageBase64: png, contentType: 'image/png', latencyMs: 45, timingTotalMs: 45, costUsd: 0.01, raw: { fixture: true } };
  }
}

export class FixtureVideoAdapter implements VideoAdapter {
  id = 'fixture-video';
  isConfigured() { return true; }
  async queueAndRetrieve() {
    return { status: 'completed' as const, latencyMs: 1200, costUsd: 0.2, downloadUrl: 'fixture://video.mp4', videoBase64: 'AAAA', contentType: 'video/mp4', raw: { fixture: true } };
  }
}

export class FixtureAudioAdapter implements AudioAdapter {
  id = 'fixture-audio';
  isConfigured() { return true; }
  async speech() {
    return { audioBase64: 'AAAA', contentType: 'audio/mpeg', latencyMs: 30, costUsd: 0.002, raw: { fixture: true } };
  }
  async transcribe() {
    return {
      text: 'the quick copper fox vaulted past the dozen quiet hens before dawn',
      latencyMs: 25,
      costUsd: 0.001,
      raw: { fixture: true },
    };
  }
}

export const textFixtures = TEXT_FIXTURES;
