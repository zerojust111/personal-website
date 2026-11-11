# Personal Website — Two Versions

Week 8 · AIE1101 · Activity: build the **same** personal website two ways, then compare them.

| Version | Stack | Files |
| --- | --- | --- |
| A — Native web | HTML + CSS + JavaScript | `index.html`, `style.css`, `script.js` |
| B — Python framework | Python + Streamlit | `app.py` |

Both versions show the same content: **About Me · Skills · Projects · Interests**, plus an interactive
element (a button in Version A, widgets in Version B).

> The content was planned first — see [`DESIGN.md`](DESIGN.md) for the design sheet written before any
> code was generated.

---

## Version A — Native web

No build step, no framework. The browser starts at `index.html`.

```text
personal-website/
├── index.html   → structure: what is on the page
├── style.css    → appearance: colours, fonts, spacing, layout
└── script.js    → behaviour: what happens after a click
```

### Run it

Option 1 — double-click `index.html`.

Option 2 — serve it on a local port (closer to a real website):

```powershell
py -m http.server 8000
# then open http://localhost:8000
```

### Where each responsibility lives

| Responsibility | File | Concrete example |
| --- | --- | --- |
| Structure | `index.html` | `<section id="skills">` with three `<li class="card">` |
| Appearance | `style.css` | `:root { --primary: #3563e9; }` — one variable drives every blue element |
| Behaviour | `script.js` | `themeButton.addEventListener("click", ...)` |

### The interactive features

1. **Theme toggle** (top-right button) — switches `data-theme` between `light` and `dark`,
   and remembers the choice in `localStorage`.
2. **Fun fact button** (About Me) — picks a random sentence from an array and writes it into
   the page with `textContent`.
3. **Footer year** — filled in by `new Date().getFullYear()`.

---

## Version B — Python + Streamlit

```powershell
pip install -r requirements.txt
python -m streamlit run app.py
```

Streamlit starts a local server, then opens `http://localhost:8501` in your browser.
The browser does **not** run Python — it only displays what the Python server sends back.

### Where each responsibility lives

| Responsibility | How it is done | Concrete example |
| --- | --- | --- |
| Structure | Python function calls | `st.header("Skills")` |
| Appearance | Almost none — Streamlit's built-in style | `st.caption(...)` and `st.divider()` get Streamlit's default look |
| Behaviour | Widgets + Python logic | `st.selectbox(...)` returns the chosen value; an `if` handles it |

### The interactive widgets

| Widget | Line | What it does |
| --- | --- | --- |
| `st.selectbox` | Projects section | choose a project, page shows its tech + description |
| `st.text_input` | Say hello | read the visitor's name |
| `st.button` | Say hello | on click, Python builds a greeting |
| `st.session_state` | Say hello | keeps the greeting on screen after the rerun |

---

## Where to put your own information

Everything below is placeholder content — change it before submitting.

**Version A (`index.html`)**

| What | Where |
| --- | --- |
| Browser tab title | `<title>Jiang Yucheng (ZeroJust) | Personal Website</title>` |
| Logo letters | `<a class="logo" href="#top">ZJ</a>` |
| Name, nickname, tagline | `.hero-name`, `.hero-alias`, `.hero-text` |
| Email link | `href="mailto:126090293@link.cuhk.edu.cn"` |
| About text | `<section id="about">` |
| Skills | the three `<li class="card">` items (name + one-line description) |
| Projects | `<section id="projects">` — two `<article class="card">` |
| Interests | `<section id="interests">` — the `<li>` list |
| Footer name | `.site-footer` |

**Version B (`app.py`)**

| What | Where |
| --- | --- |
| Name, Chinese name, nickname, role, email, about | the `PROFILE` dict at the top |
| Skills | the `SKILLS` dict (name → description) |
| Projects | the `PROJECTS` dict |
| Interests | the `INTERESTS` list |
| Fun facts (Version A) | the `FACTS` list in `script.js` |

---

## The playable project

`games/flappy-bird/` is my AIE1101 midterm project (*Flappy Bird Remastered*), embedded in the
portfolio so a visitor can play it without leaving the site.

- `index.html` + `game.js` (~860 lines, no libraries) + `assets/` (sprites and sounds)
- Controls: **Space / click** to flap · **1 / 2 / 3** difficulty · **S** skin shop · **M** mute
- Pixel art from `flappy-bird-assets` by samuelcust (MIT, see `assets/LICENSE`)

---

## Comparison

See [`COMPARISON.md`](COMPARISON.md) for the six-question table from the lecture.

---

## AI-generated vs. my own contribution

This section answers the lecture question: *"What did AI generate, what did you change, and can you explain it?"*

### What AI generated

I gave AI the two prompts from the lecture (one for HTML/CSS/JS, one for Streamlit) and it produced
the first draft of every file: the page skeleton, the CSS design system (colour variables, card grid,
responsive rules), the theme-toggle and fun-fact logic in JavaScript, and the Streamlit layout.

### What I decided or changed myself

- **All personal content** — name, nickname, major, email, skills, projects and interests — is mine.
  The first draft contained invented data that looked real, so I replaced it line by line.
- **Deleted the invented project.** The draft listed a "Number Guessing Game" that I never built.
  Keeping it would have meant presenting work I cannot show.
- **Removed the skill percentages.** The draft had numbers like "JavaScript 50%" with no basis.
  I replaced them with the skills I actually use — Python, C++, AI Programming Design — and a
  one-line description each, because a number I cannot justify is worse than no number.
- **Removed a section the draft added that I did not ask for** (the extra project card and the
  progress bars), and kept the page to the five sections the task requires.
- **Set the identity details**: page title, `ZJ` logo, the `ZeroJust` nickname line and the GitHub
  link, in both versions, so the two builds show the same person.

### What I can explain

| Part | Explanation |
| --- | --- |
| `index.html` structure | `<!DOCTYPE html>`, `<head>` for settings, `<body>` for what is visible; each `<section id="...">` is one menu item |
| `style.css` variables | `:root` holds the light colours; `html[data-theme="dark"]` overrides the same names, so one switch re-skins the page |
| Theme toggle | `applyTheme()` sets `data-theme` and saves the choice in `localStorage`; the click handler just flips the value |
| Fun fact button | an array of strings, a random index, then `textContent` writes it into the page |
| `app.py` | top-to-bottom script; Streamlit re-runs it on every interaction, `st.session_state` keeps the greeting |
| `PROFILE` / `SKILLS` / `PROJECTS` | plain Python dicts — changing content never means touching layout code |

### What I tested

Opened `index.html` in the browser, toggled the theme (it survives a reload), clicked the fun-fact
button several times, resized the window to check the mobile layout, and ran
`python -m streamlit run app.py` to test the project selectbox, the name input and the greeting button.
