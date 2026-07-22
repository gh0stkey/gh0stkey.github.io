(function () {
  "use strict";

  function initTOC() {
    const prose = document.querySelector(".prose");
    if (!prose) return;

    const headings = prose.querySelectorAll("h2, h3, h4");
    if (headings.length === 0) return;

    const tocContainer = document.createElement("div");
    tocContainer.className = "toc-container";
    tocContainer.innerHTML =
      '<button class="toc-title" type="button" aria-expanded="true" aria-controls="toc-list" aria-label="收起文章目录"><span class="toc-title-text">文章目录</span><span class="toc-toggle" aria-hidden="true"><i></i><i></i><i></i></span></button><ul class="toc-list" id="toc-list"></ul>';

    document.body.appendChild(tocContainer);

    const tocTitle = tocContainer.querySelector(".toc-title");
    const tocList = tocContainer.querySelector(".toc-list");
    const parents = {};

    tocTitle.addEventListener("click", function () {
      const collapsed = tocContainer.classList.toggle("toc-collapsed");
      tocTitle.setAttribute("aria-expanded", String(!collapsed));
      tocTitle.setAttribute("aria-label", collapsed ? "展开文章目录" : "收起文章目录");
    });

    headings.forEach((heading, index) => {
      // Generate ID if not present
      if (!heading.id) {
        heading.id = "heading-" + index;
      }

      const level = parseInt(heading.tagName.charAt(1));
      const li = document.createElement("li");
      li.className = "toc-item toc-level-" + level;

      const link = document.createElement("a");
      link.href = "#" + heading.id;
      link.textContent = heading.textContent;
      link.className = "toc-link";

      li.appendChild(link);

      if (level === 2 || !parents[level - 1]) {
        tocList.appendChild(li);
      } else {
        const parent = parents[level - 1];
        let subList = Array.from(parent.children).find((child) =>
          child.classList.contains("toc-sublist"),
        );
        if (!subList) {
          subList = document.createElement("ul");
          subList.className = "toc-sublist";
          parent.appendChild(subList);
        }
        subList.appendChild(li);
      }

      parents[level] = li;
      Object.keys(parents).forEach((parentLevel) => {
        if (Number(parentLevel) > level) delete parents[parentLevel];
      });

      // Smooth scroll
      link.addEventListener("click", function (e) {
        e.preventDefault();
        const target = document.getElementById(heading.id);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });

    // Active heading highlight on scroll
    let tocItems = document.querySelectorAll(".toc-link");
    let headingsMap = Array.from(headings).map((h) => ({
      id: h.id,
      offsetTop: h.offsetTop,
    }));

    function updateActiveTOC() {
      const scrollPos = window.scrollY + window.innerHeight * 0.35;

      let activeIndex = 0;
      for (let i = 0; i < headingsMap.length; i++) {
        if (scrollPos >= headingsMap[i].offsetTop) {
          activeIndex = i;
        } else {
          break;
        }
      }

      tocItems.forEach((item) => item.classList.remove("active"));
      if (tocItems[activeIndex]) {
        tocItems[activeIndex].classList.add("active");
      }
    }

    window.addEventListener("scroll", updateActiveTOC);
    updateActiveTOC();

  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTOC);
  } else {
    initTOC();
  }
})();
