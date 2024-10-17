window.addEventListener("DOMContentLoaded", function () {
    "use strict";
  
    var config = {
      kitId:
        document.querySelector('[lang]:not([lang="en-US"])') === null
          ? "mge7bvf"
          : "rok6rmo",
      scriptTimeout: 3000,
      active: function () {
        var loader = document.getElementById("loader");
        if (loader) {
          setTimeout(function () {
            // Hide the loader
            loader.style.display = "none";
          }, 125);
        }
      },
    };
  
    if (!window.Typekit) {
      // we load the typescript only once
      var h = document.getElementsByTagName("html")[0];
      h.className += " wf-loading";
      var t = setTimeout(function () {
        h.className = h.className.replace(/(\s|^)wf-loading(\s|$)/g, " ");
        h.className += " wf-inactive";
      }, config.scriptTimeout);
      var tk = document.createElement("script"),
        d = false;
  
      // Always load over https
      tk.src = "https://use.typekit.net/" + config.kitId + ".js";
      tk.type = "text/javascript";
      tk.async = "true";
      tk.onload = tk.onreadystatechange = function () {
        var a = this.readyState;
        if (d || (a && a !== "complete" && a !== "loaded")) {
          return;
        }
        d = true;
        clearTimeout(t);
        try {
          Typekit.load(config);
        } catch (b) {}
      };
      var s = document.getElementsByTagName("script")[0];
      s.parentNode.insertBefore(tk, s);
    }
  });