(function () {
  "use strict";

  function initTOC() {
    const prose = document.querySelector(".prose");
    if (!prose) return;

    const headings = prose.querySelectorAll("h2, h3, h4");
    if (headings.length === 0) return;

    // Create TOC container
    const tocContainer = document.createElement("div");
    tocContainer.className = "toc-container";
    tocContainer.innerHTML =
      '<div class="toc-title">TOC - 目录</div><ul class="toc-list"></ul>';

    document.body.appendChild(tocContainer);

    const tocList = tocContainer.querySelector(".toc-list");
    let h2List = null;
    let currentLevel = 2;

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

      if (level === 2) {
        tocList.appendChild(li);
        h2List = li;
      } else if (level === 3 && h2List) {
        let subList = h2List.querySelector(".toc-sublist");
        if (!subList) {
          subList = document.createElement("ul");
          subList.className = "toc-sublist";
          h2List.appendChild(subList);
        }
        subList.appendChild(li);
      } else if (level === 4 && h2List) {
        let subList = h2List.querySelector(".toc-sublist");
        if (subList) {
          const lastH3 = subList.querySelector("li:last-child");
          if (lastH3) {
            let subSubList = lastH3.querySelector(".toc-sublist");
            if (!subSubList) {
              subSubList = document.createElement("ul");
              subSubList.className = "toc-sublist";
              lastH3.appendChild(subSubList);
            }
            subSubList.appendChild(li);
          }
        }
      }

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
      const scrollPos = window.scrollY + 100;

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

    // Show/hide TOC on scroll
    let lastScrollTop = 0;
    window.addEventListener("scroll", function () {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (scrollTop > 300) {
        tocContainer.classList.add("toc-visible");
      } else {
        tocContainer.classList.remove("toc-visible");
      }
      lastScrollTop = scrollTop;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTOC);
  } else {
    initTOC();
  }
})();
