"""
app.py = Version B: Python + Streamlit

同样的个人网站内容，但界面元素全部由 Python 代码生成。
Streamlit 负责把 Python 变成浏览器里的页面。

运行方式：
    python -m streamlit run app.py
"""

import streamlit as st

# ---------------------------------------------------------------
# 1. 页面设置（浏览器标签标题、布局宽度）
# ---------------------------------------------------------------
st.set_page_config(
    page_title="姜宇成 | Portfolio",
    page_icon="👋",
    layout="centered",
)

# ---------------------------------------------------------------
# 2. 个人资料：集中放在最上面，改资料只改这里
# ---------------------------------------------------------------
PROFILE = {
    "name": "姜宇成",
    "role": "First-year Artificial Intelligence major",
    "email": "126090293@link.cuhk.edu.cn",
    "about": (
        "I am a first-year Artificial Intelligence major. My AIE1101 course started with "
        "terminal programs in Python, and now I am learning how the same ideas become an "
        "interactive web application. This page is the Streamlit version of my personal "
        "website — the same content as the HTML/CSS/JavaScript build."
    ),
}

# 技能：名字 → 熟练度（0-100）
SKILLS = {
    "Python": 75,
    "HTML": 65,
    "CSS": 60,
    "JavaScript": 50,
    "Streamlit": 70,
    "Git & GitHub": 55,
}

# 项目：标题 → (技术, 一句话说明)
PROJECTS = {
    "Personal Website": ("HTML · CSS · JavaScript", "The native version of this page."),
    "Virtual Dog Park": ("HTML · CSS · JavaScript", "Adopt, feed and grow a virtual dog."),
    "Number Guessing Game": ("Python", "A terminal game with loops and validation."),
}

INTERESTS = ["🏀 Basketball", "📷 Photography", "🤖 AI tools", "🎮 Indie games", "🍜 Street food"]

# ---------------------------------------------------------------
# 3. 头部：标题 + 简介 + 联系方式
# ---------------------------------------------------------------
st.title(f"👋 Hi, I'm {PROFILE['name']}")
st.caption(PROFILE["role"])
st.write(PROFILE["about"])

left, right = st.columns([1, 1])
with left:
    st.link_button("✉️ Email me", f"mailto:{PROFILE['email']}", use_container_width=True)
with right:
    st.link_button("📂 My GitHub", "https://github.com/YOUR-USERNAME", use_container_width=True)

st.divider()

# ---------------------------------------------------------------
# 4. 技能：进度条由 st.progress 生成
# ---------------------------------------------------------------
st.header("Skills")
for name, level in SKILLS.items():
    # 左侧写技能名，右侧显示百分比，下面跟一条进度条
    col_name, col_percent = st.columns([3, 1])
    col_name.write(f"**{name}**")
    col_percent.write(f"{level}%")
    st.progress(level / 100)

st.divider()

# ---------------------------------------------------------------
# 5. 项目：用 selectbox 这个互动控件切换查看
# ---------------------------------------------------------------
st.header("Projects")

# 互动控件：下拉框选择项目
selected_project = st.selectbox("Choose a project to see more", list(PROJECTS.keys()))
tech, description = PROJECTS[selected_project]

st.subheader(selected_project)
st.caption(f"Tech: {tech}")
st.write(description)

st.divider()

# ---------------------------------------------------------------
# 6. 兴趣：用 pill 样式展示标签
# ---------------------------------------------------------------
st.header("Interests")
st.write(" · ".join(INTERESTS))

st.divider()

# ---------------------------------------------------------------
# 7. 互动小实验：让访客留言（输入框 + 按钮 + 会话状态）
# ---------------------------------------------------------------
st.header("Say hello")
name = st.text_input("Your name", placeholder="Type your name here")

if st.button("Send greeting", type="primary"):
    if name.strip():
        # session_state 可以在页面重新运行时保留数据
        st.session_state["greeting"] = f"Thanks for visiting, {name.strip()}! 🎉"
    else:
        st.session_state["greeting"] = "Please type a name first 🙂"

if "greeting" in st.session_state:
    st.success(st.session_state["greeting"])

st.divider()
st.caption("Built with Python + Streamlit — the browser shows what the Python server generates.")
