# Design Sheet — Personal Website

Written **before** the code, as the lecture asks: decide what a visitor should learn about me,
then let AI generate both versions from this sheet.

## 1. The six design questions

| Item | Decision |
| --- | --- |
| **Website title** | `Jiang Yucheng (ZeroJust) | Personal Website` — real name for the course, nickname for the internet |
| **About Me** | First-year Artificial Intelligence major; started with Python terminal programs, now learning how the same ideas become an interactive web app; likes small projects I can finish, test and explain |
| **Skills** | Python · C++ · AI Programming Design — only skills I can actually demonstrate, no invented percentages |
| **Projects** | Personal Website (this page, built twice) · Virtual Dog Park (adopt, feed, grow, saved progress) |
| **Interests** | Programming · Minecraft · Basketball · Piano |
| **Interactive feature** | Two buttons: dark/light theme toggle (remembers the choice) and "Show a fun fact" (random sentence) |

## 2. Structure of the page (one page, five sections)

```text
Header        logo ZJ · nav (About / Skills / Projects / Interests) · theme button
Hero          name, nickname, one-sentence positioning, two actions
About Me      two paragraphs + fun-fact button and its output
Skills        three cards: name + one-line description
Projects      two cards: title, tech tag, one-line description
Interests     four tags
Footer        © 2026 · built-with line · GitHub link
```

Why one page with anchor links: the content is small, and a single page means one HTML file to
explain in the lab — no routing, no build step.

## 3. Prompts used (from the lecture)

**Native version**

```text
I am a beginner learning web development.
Create a simple personal portfolio website using only HTML, CSS, and JavaScript.
Include: About Me, Skills, Projects, Interests, one interactive button.
Use three separate files: index.html, style.css, and script.js.
Keep the code simple and explain what each file does.
```

**Streamlit version**

```text
I am a beginner learning Streamlit.
Create a simple personal portfolio using Python and Streamlit.
Include: About Me, Skills, Projects, Interests, one interactive widget.
Keep the Python code simple.
Explain each section of the program.
```

Both prompts were then corrected with this design sheet: my own content, my own skills, and **no
project I had not actually built**.

## 4. How the design maps to the two builds

| Design item | Version A (HTML/CSS/JS) | Version B (Streamlit) |
| --- | --- | --- |
| Title | `<title>` + `<h1 class="hero-name">` | `page_title` + `st.title()` |
| About | `<section id="about">` paragraphs | `PROFILE["about"]` + `st.write()` |
| Skills | three `<li class="card">` | `SKILLS` dict + `st.markdown()` |
| Projects | two `<article class="card">` | `PROJECTS` dict + `st.selectbox()` |
| Interests | `<ul class="tags">` | `INTERESTS` list + `st.write()` |
| Interaction | `addEventListener` in `script.js` | widgets + `st.session_state` |

## 5. What I deliberately left out

| Left out | Why |
| --- | --- |
| Skill progress bars | the percentages were invented; an unjustified number is worse than none |
| Extra "Number Guessing Game" project | I never built it — it appeared in the AI draft as filler |
| Photos / avatar | not required, and I did not want a placeholder image standing in for a real one |
| Multi-page navigation | one page is enough content for a five-section portfolio |
