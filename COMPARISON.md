# Comparing the Two AI-Generated Projects

Week 8 · page 24 table, filled in with what I actually observed.

| Question | HTML / CSS / JS (Version A) | Streamlit (Version B) |
| --- | --- | --- |
| **How many files?** | 3 — `index.html`, `style.css`, `script.js` | 1 main file — `app.py` (+ `requirements.txt`) |
| **Which code controls layout?** | `style.css` — `display: grid` on `.cards`, `max-width` on `.section`; the *order* of blocks is set in `index.html` | Python — `st.columns([3, 1])`, the order of `st.header` / `st.divider()` calls. Exact pixel layout is up to Streamlit |
| **Which code controls interaction?** | `script.js` — `addEventListener` on the two buttons, then DOM updates (`textContent`, `classList`, `setAttribute`) | Python — `if st.button(...)`, `st.session_state`, and the value returned by `st.selectbox`; each click reruns the whole script |
| **Which was easier to modify?** | Streamlit, for *content*: changing a skill is one line in a dict. Native web wins for *design*: changing the palette is one CSS variable | Same answer, opposite direction — fast for content, but limited control over appearance without dropping to custom CSS/HTML |
| **Which gives more design control?** | Native web. CSS can target every element, animate it, and respond to screen size exactly as I choose | Streamlit. It only exposes theming and a few layout primitives; everything else follows its own style |
| **Which would you use for an AI prototype?** | Streamlit — the model call and the UI stay in one Python file; no need to build an API, then a frontend, then connect them | Streamlit — for a quick demo, "Python only" removes the whole frontend layer |

## Short conclusion

- **Native web** = full control, more files, more moving parts. Best for a real public website
  where the design matters.
- **Streamlit** = much less code, less control. Best for a data/AI prototype that must exist today.

Whichever version I ship, the rule from the lecture still applies: *do not keep code you cannot explain.*
