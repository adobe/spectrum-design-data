---
title: Tokens
layout: base.liquid
permalink: /tokens/
---

# Tokens

Design tokens (color, typography, layout, etc.).

<ul class="spectrum-SideNav">
{% for item in collections.tokens %}
  <li class="spectrum-SideNav-item">
    <a href="/tokens/{{ item.fileSlug }}/" class="spectrum-SideNav-itemLink">{{ item.data.title | default: item.fileSlug }}</a>
  </li>
{% endfor %}
</ul>
