---
title: Tokens
layout: base.liquid
permalink: /tokens/
---

# Tokens

Design tokens (color, typography, layout, etc.).

<ul>
{% for item in collections.tokens %}
  <li>
    <a href="/tokens/{{ item.fileSlug }}/">{{ item.data.title | default: item.fileSlug }}</a>{% if item.data.description %} — {{ item.data.description }}{% endif %}
  </li>
{% endfor %}
</ul>
