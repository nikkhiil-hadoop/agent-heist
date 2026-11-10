# Agent Heist

**Make the AI assistant betray its owner.** A prompt-injection game that runs entirely in your browser.

Meet Pip, an email assistant with access to a vault key. Slip instructions into the data Pip reads and walk away with the key. Six levels, each adding a real-world defense, then switch sides and build the defense yourself.

Pip is a **rule-based simulation, not a language model**. Nothing here contacts any real system: the "vault key" is a made-up string and every address is on a reserved `.test` domain.

## The levels

| # | Level | Defense | What it teaches |
|---|---|---|---|
| 1 | Hello, naive | none | indirect prompt injection |
| 2 | Contacts only | recipient allow-list | markdown-image exfiltration |
| 3 | Bad words | keyword filter | blocklists lose to paraphrase |
| 4 | Fenced in | fenced data, fixed markers | delimiter breakout |
| 5 | Ask first | human approval + image blocking | lookalikes and approval fatigue |
| 6 | Lock-down | read-only agent, allow-list, images blocked, random fences | social engineering through the agent |

**Switch sides:** choose defenses for Pip, see which of six attacks get through, and compare your score (5 points per blocked attack, minus usability cost) with the best possible. **Hard mode** assumes the model gets fooled, so only defenses that don't rely on the model's behaviour count.

## Run locally

Plain static files (HTML, CSS, vanilla JS, no dependencies):

```bash
python3 -m http.server 4175 --bind 127.0.0.1
```

Then open <http://localhost:4175>.

## Safety notes

- A strict Content-Security-Policy (`connect-src 'none'`, `img-src data:`) blocks all network requests, so even a simulated "image beacon" can never actually load.
- Player text is only ever written with `textContent`; it is never parsed as HTML or loaded as an image. Input is capped at 1,200 characters.
- Progress is stored in `localStorage` as a per-browser convenience, validated on load, and the game works without it.

## Layout

- `engine.js`: the Pip simulator and defender scoring (pure functions, no DOM)
- `levels.js`: level text, hints and debriefs
- `game.js`, `defend.js`, `store.js`, `hero.js`, `scrolly.js`: UI

## Further reading

- [Simon Willison: the lethal trifecta](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/)
- [OWASP LLM01: Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
- [Rehberger: Trust No AI](https://arxiv.org/abs/2412.06090)
- [Microsoft MSRC: how Microsoft defends against indirect prompt injection attacks](https://www.microsoft.com/msrc/blog/2025/07/how-microsoft-defends-against-indirect-prompt-injection-attacks)
