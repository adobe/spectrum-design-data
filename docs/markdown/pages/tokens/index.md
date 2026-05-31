---
title: Tokens
layout: base.liquid
permalink: /tokens/
source_url: https://opensource.adobe.com/spectrum-design-data/pages/tokens/index/
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
