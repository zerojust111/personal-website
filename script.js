/* =====================================================================
   script.js = BEHAVIOUR (行为)
   只负责“用户做了一件事之后发生什么”。页面内容仍由 index.html 决定。
   这个文件做三件小事：
     1. 切换深色 / 浅色主题，并记住用户的选择
     2. 点击按钮随机显示一条小知识
     3. 自动写入页脚的年份
   ===================================================================== */

/* ---------- 1. 找到页面上要操作的元素 ---------- */
const themeButton = document.getElementById("theme-toggle");
const funFactButton = document.getElementById("fun-fact-btn");
const funFactBox = document.getElementById("fun-fact");
const yearSpan = document.getElementById("year");

/* ---------- 2. 主题切换 ---------- */
const THEME_KEY = "portfolio-theme";

// 读取上次保存的主题；如果没有，就用浅色
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  // 按钮文字跟着变，让用户知道下一次点击会变成什么
  themeButton.textContent = theme === "dark" ? "☀️ Light mode" : "🌙 Dark mode";
  localStorage.setItem(THEME_KEY, theme);
}

themeButton.addEventListener("click", function () {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
});

// 页面一打开就恢复上次的主题
applyTheme(localStorage.getItem(THEME_KEY) || "light");

/* ---------- 3. 随机小知识 ---------- */
const FACTS = [
  "HTML describes structure, CSS describes appearance, JavaScript describes behaviour.",
  "A browser reads index.html first, then loads the CSS and JavaScript it links to.",
  "Streamlit runs Python on a local server; the browser only shows the result.",
  "Git records checkpoints locally — git push is what puts them on GitHub.",
  "A website can work with zero JavaScript: HTML and CSS alone already render a page."
];

let lastFactIndex = -1;

funFactButton.addEventListener("click", function () {
  // 保证连续两次不会抽到同一条
  let index = Math.floor(Math.random() * FACTS.length);
  if (index === lastFactIndex) {
    index = (index + 1) % FACTS.length;
  }
  lastFactIndex = index;

  funFactBox.textContent = FACTS[index];
  funFactBox.classList.add("is-visible");
});

/* ---------- 4. 页脚年份 ---------- */
yearSpan.textContent = new Date().getFullYear();
